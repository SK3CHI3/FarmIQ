const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "OpenRouterError";
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
};

function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError(
      "OPENROUTER_API_KEY is not configured. Add it to your .env file or Netlify environment variables.",
    );
  }

  return {
    apiKey,
    model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
    siteUrl: process.env.OPENROUTER_SITE_URL ?? "https://farmiq.app",
    siteName: process.env.OPENROUTER_SITE_NAME ?? "FarmIQ",
  };
}

export async function chatWithOpenRouter({
  messages,
  model,
  temperature = 0.2,
  json = false,
}: ChatOptions) {
  const config = getOpenRouterConfig();

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": config.siteUrl,
      "X-Title": config.siteName,
    },
    body: JSON.stringify({
      model: model ?? config.model,
      messages,
      temperature,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new OpenRouterError(
      `OpenRouter request failed (${response.status}): ${body.slice(0, 300)}`,
      response.status,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new OpenRouterError("OpenRouter returned an empty response.");
  }

  return content;
}

export function parseJsonResponse<T>(content: string): T {
  try {
    return JSON.parse(content) as T;
  } catch {
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1]) as T;
    }
    throw new OpenRouterError("AI response was not valid JSON.");
  }
}
