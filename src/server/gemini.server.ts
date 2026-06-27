const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GeminiError";
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

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError(
      "GEMINI_API_KEY is not configured. Add it to your .env file or Netlify environment variables.",
    );
  }

  return {
    apiKey,
    model: process.env.GEMINI_MODEL ?? "gemini-1.5-flash",
    siteUrl: process.env.GEMINI_SITE_URL ?? "https://farmiq.app",
    siteName: process.env.GEMINI_SITE_NAME ?? "FarmIQ",
  };
}

// Convert OpenAI-style messages to Gemini format
function convertMessagesToGemini(messages: ChatMessage[]) {
  const systemMessages = messages.filter((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  // Combine system messages into a single instruction
  const systemInstruction = systemMessages.length > 0
    ? systemMessages.map((m) => m.content).join("\n\n")
    : undefined;

  // Convert chat messages to Gemini format
  const contents = chatMessages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  return { systemInstruction, contents };
}

export async function chatWithGemini({
  messages,
  model,
  temperature = 0.2,
  json = false,
}: ChatOptions) {
  const config = getGeminiConfig();
  const modelName = model ?? config.model;
  const { systemInstruction, contents } = convertMessagesToGemini(messages);

  const url = `${GEMINI_URL}/${modelName}:generateContent?key=${config.apiKey}`;

  const requestBody: any = {
    contents,
    generationConfig: {
      temperature,
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  };

  // Add system instruction if present
  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new GeminiError(
      `Gemini request failed (${response.status}): ${body.slice(0, 300)}`,
      response.status,
    );
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const content = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!content) {
    throw new GeminiError("Gemini returned an empty response.");
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
    throw new GeminiError("AI response was not valid JSON.");
  }
}
