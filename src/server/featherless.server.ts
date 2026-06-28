import { repair as repairJson } from "jsonrepair";

const FEATHERLESS_URL = (process.env.FEATHERLESS_BASE_URL ?? "https://api.featherless.ai/v1") + "/chat/completions";
const DEFAULT_TIMEOUT_MS = 25_000;
const MAX_RETRIES = 2;
const RETRY_BACKOFF_BASE_MS = 500;
const RESPONSE_CACHE_ENABLED = true;

export class FeatherlessError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "FeatherlessError";
  }
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatOptions = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  json?: boolean;
  max_tokens?: number;
};

type FeatherlessRequestBody = {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  max_tokens: number;
  response_format?: { type: "json_object" };
};

type FeatherlessConfig = {
  apiKey: string;
  model: string;
  fallbackModels: string[];
  siteUrl: string;
  siteName: string;
  timeoutMs: number;
};

const featherlessResponseCache = new Map<string, Promise<string>>();

function getFeatherlessConfig(): FeatherlessConfig {
  const apiKey = process.env.FEATHERLESS_API_KEY;
  if (!apiKey) {
    throw new FeatherlessError(
      "FEATHERLESS_API_KEY is not configured. Add it to your .env file or Netlify environment variables.",
    );
  }

  const primaryModel = process.env.FEATHERLESS_MODEL ?? "meta-llama/Meta-Llama-3.1-8B-Instruct";
  const fallbackModels = [
    process.env.FEATHERLESS_MODEL_FALLBACK ?? "meta-llama/Meta-Llama-3.0-instruct",
    process.env.FEATHERLESS_MODEL_FALLBACK_2 ?? "meta-llama/Meta-Llama-2.7b",
  ]
    .filter(Boolean)
    .map(String)
    .filter((m) => m !== primaryModel);

  return {
    apiKey,
    model: primaryModel,
    fallbackModels,
    siteUrl: process.env.FEATHERLESS_SITE_URL ?? "https://farmiq.app",
    siteName: process.env.FEATHERLESS_SITE_NAME ?? "FarmIQ",
    timeoutMs: Number(process.env.FEATHERLESS_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS),
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecoverableStatus(status: number) {
  return status === 429 || status === 502 || status === 503 || status === 504 || (status >= 500 && status < 600);
}

function shouldFallbackModel(status: number) {
  return status === 404 || status === 422 || status === 429 || (status >= 500 && status < 600);
}

function buildCacheKey(body: FeatherlessRequestBody) {
  return JSON.stringify(body);
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function executeFeatherlessRequest(body: FeatherlessRequestBody): Promise<string> {
  const requestKey = buildCacheKey(body);
  if (RESPONSE_CACHE_ENABLED) {
    const cached = featherlessResponseCache.get(requestKey);
    if (cached) {
      return cached;
    }
  }

  const promise = (async () => {
    const cfg = getFeatherlessConfig();
    const headers = {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": cfg.siteUrl,
      "X-Title": cfg.siteName,
    };
    const bodyString = JSON.stringify(body);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.debug('[Featherless] request', {
          model: body.model,
          messages: body.messages.length,
          temperature: body.temperature,
          max_tokens: body.max_tokens,
          attempt: attempt + 1,
        });

        const res = await fetchWithTimeout(FEATHERLESS_URL, {
          method: "POST",
          headers,
          body: bodyString,
        }, cfg.timeoutMs);

        const text = await res.text();
        console.debug('[Featherless] response status', res.status, 'attempt', attempt + 1);

        if (res.ok) {
          return text;
        }

        const snippet = text.slice(0, 2000);
        lastError = new FeatherlessError(`Featherless request failed (${res.status}): ${snippet}`, res.status);

        if (attempt < MAX_RETRIES && isRecoverableStatus(res.status)) {
          await delay(RETRY_BACKOFF_BASE_MS * 2 ** attempt);
          continue;
        }

        throw lastError;
      } catch (error: unknown) {
        if (error instanceof FeatherlessError && attempt < MAX_RETRIES && isRecoverableStatus(error.status ?? 0)) {
          await delay(RETRY_BACKOFF_BASE_MS * 2 ** attempt);
          lastError = error;
          continue;
        }

        if (error instanceof Error && error.name === "AbortError") {
          lastError = new FeatherlessError(`Featherless request timed out after ${cfg.timeoutMs}ms.`, 408);
          if (attempt < MAX_RETRIES) {
            await delay(RETRY_BACKOFF_BASE_MS * 2 ** attempt);
            continue;
          }
        }

        throw error;
      }
    }

    throw lastError ?? new FeatherlessError("Featherless request failed without a response.");
  })();

  if (RESPONSE_CACHE_ENABLED) {
    featherlessResponseCache.set(requestKey, promise);
  }

  try {
    return await promise;
  } catch (error) {
    if (RESPONSE_CACHE_ENABLED) {
      featherlessResponseCache.delete(requestKey);
    }
    throw error;
  }
}

function extractContent(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const payloadObject = payload as Record<string, unknown>;
  const message = payloadObject.choices && Array.isArray(payloadObject.choices)
    ? payloadObject.choices[0]?.message
    : undefined;

  const content = message?.content ?? payloadObject.content ?? payload;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content.map((item) => String(item)).join("\n").trim();
  }
  if (typeof content === "object" && content !== null) {
    return JSON.stringify(content, null, 2);
  }

  return undefined;
}

function extractFencedJson(content: string) {
  const matches = [...content.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  return matches.map((match) => match[1]);
}

function extractBalancedJson(content: string) {
  const start = content.search(/[\{\[]/);
  if (start === -1) return [];

  const stack: string[] = [];
  for (let i = start; i < content.length; i++) {
    const char = content[i];
    if (char === '{' || char === '[') {
      stack.push(char);
    } else if (char === '}' || char === ']') {
      const last = stack.pop();
      if (!last) break;
      if (stack.length === 0) {
        return [content.slice(start, i + 1)];
      }
    }
  }

  return [];
}

function wrapObjectLikeContent(content: string) {
  const trimmed = content.trim();
  if (/^[\{\[]/.test(trimmed)) return trimmed;

  const keyValueLine = /^['"]?[a-zA-Z0-9_-]+['"]?\s*:/;
  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 0 && lines.every((line) => keyValueLine.test(line))) {
    return `{${trimmed}}`;
  }

  return trimmed;
}

function repairCandidate(candidate: string) {
  try {
    return repairJson(candidate);
  } catch {
    return candidate
      .replace(/\u2018|\u2019|\u201C|\u201D/g, '"')
      .replace(/([\{,\[]\s*)'(.*?)'(?=\s*[:\]}])/g, '$1"$2"')
      .replace(/,\s*([}\]])/g, '$1');
  }
}

export async function chatWithFeatherless({
  messages,
  model,
  temperature = 0.2,
  json = false,
  max_tokens = 512,
}: ChatOptions) {
  const cfg = getFeatherlessConfig();
  const models = Array.from(new Set([model ?? cfg.model, ...cfg.fallbackModels]));

  let lastError: Error | undefined;
  for (const currentModel of models) {
    const body: FeatherlessRequestBody = {
      model: currentModel,
      messages,
      temperature,
      max_tokens,
      response_format: json ? { type: "json_object" } : undefined,
    };

    try {
      const text = await executeFeatherlessRequest(body);
      const snippet = text.slice(0, 1000);
      console.debug('[Featherless] raw response (truncated):', snippet);

      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        console.warn('[Featherless] response not JSON, returning raw text');
        return text;
      }

      const content = extractContent(payload);
      if (!content) {
        const snippet = JSON.stringify(payload).slice(0, 2000);
        throw new FeatherlessError(`Featherless returned no readable content. Raw payload (truncated): ${snippet}`);
      }

      console.debug('[Featherless] content length', content.length);
      return content;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (error instanceof FeatherlessError && shouldFallbackModel(error.status ?? 0) && currentModel !== models[models.length - 1]) {
        console.warn('[Featherless] model failed, trying fallback', currentModel, error.message);
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new FeatherlessError("Featherless failed to return a response.");
}

export function parseJsonResponse<T>(content: string): T {
  const normalized = wrapObjectLikeContent(content);
  const candidates = [normalized, ...extractFencedJson(content), ...extractBalancedJson(content)];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;

    try {
      return JSON.parse(trimmed) as T;
    } catch {
      try {
        return JSON.parse(repairCandidate(trimmed)) as T;
      } catch {
        // fall through to next candidate
      }
    }
  }

  throw new FeatherlessError(`AI response was not valid JSON. Raw response (truncated): ${content.slice(0, 2000)}`);
}
