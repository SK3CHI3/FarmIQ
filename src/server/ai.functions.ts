import { createServerFn } from "@tanstack/react-start";
import {
  runQualityScan,
  summarizeFarmersForAi,
  validateFarmer,
  type FarmerValidation,
} from "@/lib/farmer-validation";
import { chatWithGemini, GeminiError, parseJsonResponse } from "./gemini.server";
import { getFarmers } from "./farmers.functions";

export type IntelligenceAnswer = {
  summary: string;
  farmerIds: string[];
  sources: string[];
  reasoning: string;
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
  .inputValidator((data: { farmerId: string }) => {
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
  .inputValidator((data: { query: string }) => {
    if (!data?.query?.trim()) throw new Error("query is required.");
    return { query: data.query.trim() };
  })
  .handler(async ({ data }) => {
    const farmers = await getFarmers();
    const dataset = summarizeFarmersForAi(farmers);
    const validations = farmers.map((f) => validateFarmer(f));

    const content = await chatWithGemini({
      json: true,
      messages: [
        {
          role: "system",
          content: [
            "You are FarmIQ, an agricultural data intelligence assistant for Kenya and Nigeria smallholder farmers.",
            "Answer using ONLY the provided farmer dataset and validation rules.",
            "Return JSON with keys: summary (string), farmerIds (string[]), sources (string[]), reasoning (string).",
            "farmerIds must only contain IDs from the dataset.",
            "If no farmers match, return an empty farmerIds array and explain why in summary.",
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
    });

    const parsed = parseJsonResponse<IntelligenceAnswer>(content);
    const knownIds = new Set(farmers.map((f) => f.id));

    return {
      ...parsed,
      farmerIds: (parsed.farmerIds ?? []).filter((id) => knownIds.has(id)),
    };
  });

export const suggestDataFix = createServerFn({ method: "POST" })
  .inputValidator((data: { farmerId: string; issue: string }) => {
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

    const content = await chatWithGemini({
      json: true,
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
    });

    return parseJsonResponse<AutoFixSuggestion>(content);
  });
