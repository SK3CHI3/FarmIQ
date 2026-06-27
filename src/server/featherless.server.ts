const FEATHERLESS_URL = (process.env.FEATHERLESS_BASE_URL ?? "https://api.featherless.ai/v1") + "/chat/completions";

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

function getFeatherlessConfig() {
  const apiKey = process.env.FEATHERLESS_API_KEY;
  if (!apiKey) {
    throw new FeatherlessError(
      "FEATHERLESS_API_KEY is not configured. Add it to your .env file or Netlify environment variables.",
    );
  }

  return {
    apiKey,
    model: process.env.FEATHERLESS_MODEL ?? "meta-llama/Meta-Llama-3.1-8B-Instruct",
    siteUrl: process.env.FEATHERLESS_SITE_URL ?? "https://farmiq.app",
    siteName: process.env.FEATHERLESS_SITE_NAME ?? "FarmIQ",
  };
}

export async function chatWithFeatherless({
  messages,
  model,
  temperature = 0.2,
  json = false,
  max_tokens = 512,
}: ChatOptions) {
  const cfg = getFeatherlessConfig();

  const body: any = {
    model: model ?? cfg.model,
    messages,
    temperature,
    max_tokens,
  };

  if (json) body.response_format = { type: "json_object" };
  console.log('[Featherless] request', { model: body.model, messages: messages.length, temperature, max_tokens });

  const res = await fetch(FEATHERLESS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": cfg.siteUrl,
      "X-Title": cfg.siteName,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log('[Featherless] response status', res.status);
  if (!res.ok) {
    const snippet = text.slice(0, 2000);
    console.error('[Featherless] error response (truncated):', snippet);
    throw new FeatherlessError(`Featherless request failed (${res.status}): ${snippet}`, res.status);
  }

  // parse JSON and extract content
  let payload: any;
  try {
    payload = JSON.parse(text);
  } catch (err) {
    console.warn('[Featherless] response not JSON, returning raw text');
    // preserve raw text, parser upstream will try tolerant parse
    return text;
  }

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    const snippet = JSON.stringify(payload).slice(0, 2000);
    console.error('[Featherless] empty content in payload (truncated):', snippet);
    throw new FeatherlessError('Featherless returned an empty response.');
  }

  console.log('[Featherless] content length', content.length);
  return content;
}

export function parseJsonResponse<T>(content: string): T {
  // 1) Direct JSON
  try {
    return JSON.parse(content) as T;
  } catch (e) {
    // continue to tolerant parsing
  }

  // 2) Fenced JSON ```json ... ```
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]) as T;
    } catch {
      // fallthrough
    }
  }

  // 3) Try to find the first balanced JSON object or array in the text
  const firstBracket = content.search(/[\{\[]/);
  if (firstBracket !== -1) {
    const start = firstBracket;
    const stack: string[] = [];
    let end = -1;
    for (let i = start; i < content.length; i++) {
      const ch = content[i];
      if (ch === '{' || ch === '[') stack.push(ch);
      else if (ch === '}' || ch === ']') {
        const last = stack.pop();
        if (!last) break;
        if (stack.length === 0) { end = i + 1; break; }
      }
    }
    if (end !== -1) {
      const candidate = content.slice(start, end);
      try {
        return JSON.parse(candidate) as T;
      } catch {
        // fallthrough
      }
    }
  }

  // 4) Lightweight repair: convert single quotes to double quotes and remove trailing commas
  try {
    const repaired = content
      .replace(/\u2018|\u2019|\u201C|\u201D/g, '"')
      .replace(/([\{,\[]\s*)'(.*?)'(?=\s*[:\]}])/g, '$1"$2"')
      .replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(repaired) as T;
  } catch {
    // final fallback: include truncated raw output for debugging
    const snippet = content.slice(0, 2000);
    throw new FeatherlessError(`AI response was not valid JSON. Raw response (truncated): ${snippet}`);
  }
}
