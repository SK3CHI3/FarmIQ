import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  runQualityScan,
  summarizeFarmersForAi,
  validateFarmer,
  type FarmerValidation,
} from "@/lib/farmer-validation";
import { chatWithFeatherless, FeatherlessError, parseJsonResponse } from "./featherless.server";
import { getFarmers } from "./farmers.functions";

type FeatherlessMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type FeatherlessCallOptions = {
  messages: FeatherlessMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
};

async function callFeatherlessJson<T>(options: FeatherlessCallOptions): Promise<T | string> {
  try {
    console.debug('[AI] calling Featherless', { model: options.model, messages: options.messages.length, temperature: options.temperature, max_tokens: options.max_tokens });
    const content = await chatWithFeatherless({
      messages: options.messages,
      model: options.model,
      temperature: options.temperature,
      json: true,
      max_tokens: options.max_tokens,
    });

    console.debug('[AI] raw response (truncated):', typeof content === 'string' ? content.slice(0, 1000) : JSON.stringify(content).slice(0, 1000));

    try {
      const parsed = parseJsonResponse<T>(content);
      console.debug('[AI] parsed response keys:', parsed && typeof parsed === 'object' ? Object.keys(parsed as Record<string, unknown>) : typeof parsed);
      return parsed;
    } catch (parseErr) {
      console.warn('[AI] response not valid JSON, preserving raw output:', parseErr instanceof Error ? parseErr.message : String(parseErr));
      return content;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AI] call failed:', message);
    if (err instanceof FeatherlessError) {
      throw new Error(`Featherless error${err.status ? ` (${err.status})` : ""}: ${err.message}`);
    }
    throw new Error(`AI call failed: ${message}`);
  }
}

const intelligenceSchema = z.object({
  summary: z.string().optional(),
  farmerIds: z.union([
    z.array(z.string()),
    z.string(),
    z.record(z.string()),
  ]).optional(),
  sources: z.array(z.string()).optional(),
  reasoning: z.string().optional(),
  details: z.record(z.object({
    explanation: z.string().optional(),
    matchedChecks: z.array(z.string()).optional(),
    confidence: z.enum(["high", "medium", "low"]).optional(),
  })).optional(),
}).passthrough();

type IntelligenceAnswerInput = z.infer<typeof intelligenceSchema>;

const autoFixSchema = z.object({
  summary: z.string(),
  suggestions: z.array(z.object({
    field: z.string(),
    currentValue: z.string().nullable(),
    suggestedValue: z.string(),
    confidence: z.enum(["high", "medium", "low"]),
    rationale: z.string(),
  })),
  requiresHumanReview: z.boolean(),
});

export type IntelligenceAnswer = {
  summary: string;
  farmerIds: string[];
  sources: string[];
  reasoning: string;
  details?: Record<
    string,
    {
      explanation?: string;
      matchedChecks?: string[];
      confidence?: "high" | "medium" | "low";
    }
  >;
  rawResponse?: string;
};

export type AutoFixSuggestion = z.infer<typeof autoFixSchema>;

function normalizeStringArray(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeStringArray(parsed);
    } catch {
      return value.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean);
    }
  }
  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const keys = Object.keys(objectValue);
    const allNumeric = keys.length > 0 && keys.every((key) => /^\d+$/.test(key));
    if (allNumeric) {
      return keys
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => String(objectValue[key]))
        .filter(Boolean);
    }
  }

  return [];
}

function normalizeText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  return String(value);
}

function rawResponseString(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function shouldIncludeRawResponse(raw: unknown): boolean {
  if (raw === undefined || raw === null) return false;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed !== "" && trimmed !== "[]" && trimmed !== "{}";
  }
  if (Array.isArray(raw)) return raw.length > 0;
  if (typeof raw === "object") return Object.keys(raw).length > 0;
  return true;
}

function normalizeIntelligenceAnswer(raw: unknown): IntelligenceAnswer {
  if (typeof raw === "string") {
    return {
      summary: "AI returned an unparsed response. See raw output for details.",
      farmerIds: [],
      sources: [],
      reasoning: "",
      rawResponse: shouldIncludeRawResponse(raw) ? raw : undefined,
    };
  }

  if (typeof raw !== "object" || raw === null) {
    return {
      summary: "AI returned an unexpected response type.",
      farmerIds: [],
      sources: [],
      reasoning: "",
      rawResponse: shouldIncludeRawResponse(raw) ? rawResponseString(raw) : undefined,
    };
  }

  const parsed = intelligenceSchema.safeParse(raw);
  const candidate = raw as Record<string, unknown>;
  const rawResponse = shouldIncludeRawResponse(raw) ? rawResponseString(raw) : undefined;

  if (!parsed.success) {
    return {
      summary: normalizeText(candidate.summary) || "AI returned a response that did not match the expected schema.",
      farmerIds: normalizeStringArray(candidate.farmerIds ?? candidate),
      sources: normalizeStringArray(candidate.sources),
      reasoning: normalizeText(candidate.reasoning),
      details: typeof candidate.details === "object" && candidate.details !== null ? (candidate.details as Record<string, any>) : undefined,
      rawResponse,
    };
  }

  return {
    summary: normalizeText(parsed.data.summary) || "AI returned an incomplete response.",
    farmerIds: normalizeStringArray(parsed.data.farmerIds),
    sources: normalizeStringArray(parsed.data.sources),
    reasoning: normalizeText(parsed.data.reasoning),
    details: parsed.data.details,
  };
}

export const scanDataQuality = createServerFn({ method: "POST" }).handler(async () => {
  const farmers = await getFarmers();
  return runQualityScan(farmers);
});

export const confirmFarmerData = createServerFn({ method: "POST" })
  .validator((data: { farmerId: string }) => {
    if (!data?.farmerId?.trim()) throw new Error("farmerId is required.");
    return data;
  })
  .handler(async ({ data }) => {
    const farmers = await getFarmers();
    const farmer = farmers.find((f) => f.id === data.farmerId);
    if (!farmer) throw new Error(`Farmer ${data.farmerId} not found.`);
    return validateFarmer(farmer);
  });

export const askIntelligence = createServerFn({ method: "POST" })
  .validator((data: { query: string }) => {
    if (!data?.query?.trim()) throw new Error("query is required.");
    return { query: data.query.trim() };
  })
  .handler(async ({ data }) => {
    const farmers = await getFarmers();
    const dataset = summarizeFarmersForAi(farmers);
    const validations = farmers.map((f) => validateFarmer(f));

    let rawResponse: unknown;
    try {
      rawResponse = await callFeatherlessJson<unknown>({
        messages: [
          {
            role: "system",
            content: [
              "You are FarmIQ, an agricultural data intelligence assistant for Kenya and Nigeria smallholder farmers.",
              "Answer using ONLY the provided farmer dataset and validation rules.",
              "Return JSON with keys: summary (string), farmerIds (string[]), sources (string[]), reasoning (string), and details (object).",
              "The 'details' object should map farmer IDs to an object with: explanation (string) describing why the farmer was included or excluded, optional matchedChecks (string[]) listing which validation checks passed, and optional confidence ('high'|'medium'|'low').",
              "Example response shape: { summary: '...', farmerIds: ['FQ-001'], sources: [...], reasoning: '...', details: { 'FQ-001': { explanation: 'Has GPS and consent; credit ready', matchedChecks: ['gps','consent'], confidence: 'high' } } }",
              "farmerIds must only contain IDs present in the provided dataset.",
              "If no farmers match, return an empty farmerIds array and include a clear explanation in both summary and details (empty object or omitted).",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify({
              question: data.query,
              farmers: dataset,
              validationRules: {
                tiers: {
                  1: "Identity — name plus national ID or phone",
                  2: "Farm + production — crop, region, cooperative or agent linkage",
                  3: "Financial — digital payment method and consent collected",
                  4: "Verified + geo — GPS, national ID, and consented",
                },
                credit: "Tier 3+, national ID, M-Pesa/Bank/Other digital payment, consent Consented",
                insurance: "GPS polygon, crop, region, consent not Not collected",
                input: "Crop, region, cooperative or field-agent linkage",
              },
              computedValidations: validations,
            }),
          },
        ],
        max_tokens: 1024,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[AI] askIntelligence failed:', message);
      return {
        summary: `AI request failed: ${message}`,
        farmerIds: [],
        sources: [],
        reasoning: '',
        rawResponse: message,
      };
    }

    const normalized = normalizeIntelligenceAnswer(rawResponse);
    const knownIds = new Set(farmers.map((f) => f.id));
    normalized.farmerIds = normalized.farmerIds.filter((id) => knownIds.has(id));

    if (!normalized.farmerIds.length && !normalized.summary) {
      normalized.summary = "AI returned a response but could not extract valid farmer IDs.";
    }

    console.debug('[AI] normalized response', {
      summary: normalized.summary,
      farmerIdsCount: normalized.farmerIds.length,
      sources: normalized.sources,
    });

    return normalized;
  });

export const suggestDataFix = createServerFn({ method: "POST" })
  .validator((data: { farmerId: string; issue: string }) => {
    if (!data?.farmerId?.trim() || !data?.issue?.trim()) {
      throw new Error("farmerId and issue are required.");
    }
    return { farmerId: data.farmerId.trim(), issue: data.issue.trim() };
  })
  .handler(async ({ data }) => {
    const farmers = await getFarmers();
    const farmer = farmers.find((f) => f.id === data.farmerId);
    if (!farmer) throw new Error(`Farmer ${data.farmerId} not found.`);
    const validation: FarmerValidation = validateFarmer(farmer);

    const parsed = await callFeatherlessJson<unknown>({
      messages: [
        {
          role: "system",
          content: [
            "You are FarmIQ's data quality assistant.",
            "Suggest safe, realistic fixes for farmer records in East Africa.",
            "Never invent national IDs or phone numbers — recommend verification steps instead.",
            "Return JSON with keys: summary (string), suggestions (array of {field, currentValue, suggestedValue, confidence, rationale}), requiresHumanReview (boolean).",
            "confidence must be high, medium, or low.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({ issue: data.issue, farmer, validation }),
        },
      ],
      max_tokens: 512,
    });

    if (typeof parsed === "string") {
      throw new Error(`AI returned invalid suggestion format. Raw response: ${parsed}`);
    }

    const result = autoFixSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`AI returned invalid suggestion format. Raw response: ${JSON.stringify(parsed).slice(0, 2000)}`);
    }

    const suggestion: AutoFixSuggestion = {
      summary: result.data.summary,
      suggestions: result.data.suggestions.map((suggestion) => ({
        field: suggestion.field,
        currentValue: suggestion.currentValue,
        suggestedValue: suggestion.suggestedValue,
        confidence: suggestion.confidence,
        rationale: suggestion.rationale,
      })),
      requiresHumanReview: result.data.requiresHumanReview,
    };

    return suggestion;
  });
