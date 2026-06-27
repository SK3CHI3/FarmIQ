import { createServerFn } from "@tanstack/react-start";
import {
  runQualityScan,
  summarizeFarmersForAi,
  validateFarmer,
  type FarmerValidation,
} from "@/lib/farmer-validation";
import { chatWithFeatherless, FeatherlessError, parseJsonResponse } from "./featherless.server";
import { getFarmers } from "./farmers.functions";

async function callFeatherlessJson<T>({
  messages,
  model,
  temperature = 0.2,
  max_tokens = 1024,
}: {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<T> {
  try {
    console.log('[AI] calling Featherless', { model, messages: messages.length, temperature, max_tokens });
    const content = await chatWithFeatherless({
      messages: messages as any,
      model,
      temperature,
      json: true,
      max_tokens,
    });

    console.log('[AI] raw response (truncated):', typeof content === 'string' ? content.slice(0, 1000) : JSON.stringify(content).slice(0, 1000));

    const parsed = parseJsonResponse<T>(content);
    console.log('[AI] parsed response keys:', parsed && typeof parsed === 'object' ? Object.keys(parsed as any) : typeof parsed);
    return parsed;
  } catch (err: any) {
    console.error('[AI] call failed:', err?.message ?? String(err));
    if (err instanceof FeatherlessError) {
      throw new Error(`Featherless error${err.status ? ` (${err.status})` : ""}: ${err.message}`);
    }
    // preserve parse errors and others with context
    throw new Error(`AI call failed: ${err?.message ?? String(err)}`);
  }
}

export type IntelligenceAnswer = {
  summary: string;
  farmerIds: string[];
  sources: string[];
  reasoning: string;
  // Optional per-farmer details: keyed by farmerId with an explanation and optionally matched checks
  details?: Record<
    string,
    {
      explanation: string;
      matchedChecks?: string[];
      confidence?: "high" | "medium" | "low";
    }
  >;
};

export type AutoFixSuggestion = {
  summary: string;
  suggestions: Array<{
    field: string;
    currentValue: string | null;
    suggestedValue: string;
    confidence: "high" | "medium" | "low";
    rationale: string;
  }>;
  requiresHumanReview: boolean;
};

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

    const parsed = await callFeatherlessJson<any>({
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
    // Normalize a variety of LLM outputs into the expected IntelligenceAnswer shape.
    const knownIds = new Set(farmers.map((f) => f.id));

    // Helper: convert numeric-keyed objects or arrays to a simple array of ids
    function toIdArray(x: any): string[] {
      if (!x) return [];
      if (Array.isArray(x)) return x.map(String);
      // numeric-keyed object: {"0":"FQ-001","1":"FQ-002"}
      const keys = Object.keys(x);
      const allNumeric = keys.length > 0 && keys.every((k) => /^\d+$/.test(k));
      if (allNumeric) {
        return keys
          .sort((a, b) => Number(a) - Number(b))
          .map((k) => String(x[k]));
      }
      // fallback: if it's an object with farmerIds property that's a string of comma-separated ids
      if (typeof x === 'string') {
        try {
          const parsed = JSON.parse(x);
          return toIdArray(parsed);
        } catch {}
        return x.split(/[,\s]+/).filter(Boolean);
      }
      return [];
    }

    const normalized: IntelligenceAnswer = {
      summary: typeof parsed?.summary === 'string' ? parsed.summary : (Array.isArray(parsed) ? `Found ${parsed.length} farmers` : ''),
      farmerIds: toIdArray(parsed?.farmerIds ?? parsed),
      sources: Array.isArray(parsed?.sources) ? parsed.sources : [],
      reasoning: typeof parsed?.reasoning === 'string' ? parsed.reasoning : '',
      details: typeof parsed?.details === 'object' && parsed?.details ? parsed.details : undefined,
    };

    console.log('[AI] normalized response keys:', Object.keys(normalized), 'farmerIds length', normalized.farmerIds.length);

    // filter to known IDs
    normalized.farmerIds = normalized.farmerIds.filter((id) => knownIds.has(id));

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

    const parsed = await callFeatherlessJson<AutoFixSuggestion>({
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

    // Basic validation of returned shape
    if (!parsed || typeof parsed !== "object" || !parsed.summary) {
      throw new Error("AI returned invalid suggestion format.");
    }

    return parsed;
  });
