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
  
  // Debug logging
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found in environment");
    console.error("Available env keys:", Object.keys(process.env).filter(k => k.includes("GEMINI")));
    throw new GeminiError(
      "GEMINI_API_KEY is not configured. Add it to your .env file or Netlify environment variables.",
    );
  }
  
  // Log API key format for debugging (first 10 chars only)
  console.log("✅ GEMINI_API_KEY found, starts with:", apiKey.slice(0, 10));
  console.log("✅ API key length:", apiKey.length);

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

  console.log("🔵 Gemini request starting...");
  console.log("🔵 Model:", modelName);
  console.log("🔵 URL (masked):", url.replace(config.apiKey, "***API_KEY***"));
  console.log("🔵 Contents length:", contents.length);
  console.log("🔵 Has system instruction:", !!systemInstruction);

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

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("🔵 Response status:", response.status);
    console.log("🔵 Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const body = await response.text();
      console.error("❌ Gemini error response:", body);
      
      // Provide helpful error messages
      if (response.status === 401) {
        throw new GeminiError(
          `Authentication failed. Please verify your GEMINI_API_KEY is correct. It should start with "AIza". Error: ${body.slice(0, 200)}`,
          response.status,
        );
      }
      
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
      console.error("❌ No content in response:", JSON.stringify(payload, null, 2));
      throw new GeminiError("Gemini returned an empty response.");
    }

    console.log("✅ Gemini request successful, content length:", content.length);
    return content;
  } catch (error) {
    console.error("❌ Gemini error caught:", error);
    
    // Re-throw GeminiError as-is
    if (error instanceof GeminiError) {
      throw error;
    }
    
    // Wrap network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new GeminiError(
        `Network error: Unable to reach Gemini API. Check your internet connection. ${error.message}`,
      );
    }
    
    // Wrap any other errors
    throw new GeminiError(
      `Unexpected error calling Gemini: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
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
