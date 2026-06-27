// ── UI-only config data (no farmer records — all live data comes from Neo4j) ──

export type Decision = "ready" | "not-ready";
export type Tier = 1 | 2 | 3 | 4;

export interface Farmer {
  id: string;
  name: string;
  region: string;
  country: "Kenya" | "Nigeria";
  crop: string;
  phone: string;
  completeness: number;
  tier: Tier;
  nationalId: string | null;
  gps: boolean;
  paymentMethod: "M-Pesa" | "Bank" | "Cash" | "Other digital";
  cooperative: string | null;
  credit: Decision;
  insurance: Decision;
  input: Decision;
  lastUpdated: string;
  consent: "Consented" | "Pending" | "Not collected";
  source: string;
}

// ── Static chart/UI config ────────────────────────────────────────────────────

export const dataSources = [
  { name: "KIAMIS Registry", short: "KIAMIS", completeness: 91, records: 1580, kind: "Government" },
  { name: "Tegemeo Cooperative Register", short: "Tegemeo", completeness: 78, records: 880, kind: "Cooperative" },
  { name: "Agrovesto Field Agents", short: "Agrovesto", completeness: 64, records: 612, kind: "Field" },
  { name: "M-Pesa Payment History", short: "M-Pesa", completeness: 82, records: 1240, kind: "Payments" },
  { name: "KALRO Satellite / Weather", short: "KALRO", completeness: 70, records: 950, kind: "Geo" },
  { name: "Nigeria NDFR", short: "NDFR", completeness: 58, records: 430, kind: "Government" },
  { name: "AgStack Field Registry", short: "AgStack", completeness: 66, records: 510, kind: "Geo" },
];

export const activityFeed = [
  { time: "12 min ago", text: "Agrovesto CSV ingested — 340 new records from Kaduna field team" },
  { time: "1 hr ago", text: "GraphRAG flagged 12 duplicate farmer nodes across KIAMIS and Tegemeo" },
  { time: "3 hr ago", text: "Loan officer viewed farmer profile: James Ochieng (Tier 2)" },
  { time: "Yesterday", text: "Export generated: 47 credit-ready farmers in Machakos (consent-gated)" },
  { time: "Yesterday", text: "Consent SMS batch sent to 98 farmers via Africa's Talking" },
];

export const tierDistribution = [
  { tier: "Tier 1", label: "Identity", count: 4742, unlocks: "Registration" },
  { tier: "Tier 2", label: "Farm + Production", count: 3610, unlocks: "Cooperative & input matching" },
  { tier: "Tier 3", label: "Financial", count: 2188, unlocks: "Credit & payments" },
  { tier: "Tier 4", label: "Verified + Geo", count: 1284, unlocks: "Insurance & off-take" },
];

export const baselineFieldCoverage = [
  { field: "National ID", coverage: 86 },
  { field: "Full Name", coverage: 99 },
  { field: "Mobile Number", coverage: 78 },
  { field: "Location", coverage: 92 },
  { field: "Land Size", coverage: 71 },
  { field: "Value Chains", coverage: 84 },
];

export const paymentMix = [
  { name: "M-Pesa", value: 2480, color: "var(--primary)" },
  { name: "Bank", value: 612, color: "oklch(0.65 0.08 200)" },
  { name: "Other digital", value: 290, color: "oklch(0.7 0.12 280)" },
  { name: "Cash", value: 1360, color: "oklch(0.78 0.16 75)" },
];

export const suggestedQueries = [
  "Which farmers are members of a cooperative with crop yield data and at least one digital payment?",
  "Which data source has the most missing Tier 1 baseline fields?",
  "Show me all Tier 3 farmers eligible for input financing.",
  "Which farmers are missing GPS polygons?",
];
