// ── Shared types & utilities — no static data ────────────────────────────────

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

/** SSR-safe number formatter — always en-US so server and client match */
export function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

/** Suggested AI queries shown in the Intelligence page */
export const suggestedQueries = [
  "Which farmers are members of a cooperative with digital payment and crop data?",
  "Which data source has the most missing Tier 1 baseline fields?",
  "Show me all Tier 3 farmers eligible for input financing.",
  "Which farmers are missing GPS polygons?",
];
