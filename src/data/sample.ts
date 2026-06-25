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

export const farmers: Farmer[] = [
  { id: "FQ-00142", name: "Amina Wanjiku", region: "Machakos", country: "Kenya", crop: "Maize", phone: "+254 712 884 221", completeness: 91, tier: 4, nationalId: "29384***12", gps: true, paymentMethod: "M-Pesa", cooperative: "Tegemeo SACCO", credit: "ready", insurance: "ready", input: "ready", lastUpdated: "2026-06-12", consent: "Consented", source: "KIAMIS Registry" },
  { id: "FQ-00187", name: "James Ochieng", region: "Kisumu", country: "Kenya", crop: "Sorghum", phone: "+254 733 552 109", completeness: 67, tier: 2, nationalId: "31204***88", gps: true, paymentMethod: "M-Pesa", cooperative: "Tegemeo SACCO", credit: "ready", insurance: "not-ready", input: "ready", lastUpdated: "2026-06-09", consent: "Consented", source: "Tegemeo Cooperative Register" },
  { id: "FQ-00231", name: "Fatima Musa", region: "Kano", country: "Nigeria", crop: "Millet", phone: "—", completeness: 44, tier: 1, nationalId: null, gps: false, paymentMethod: "Cash", cooperative: null, credit: "not-ready", insurance: "not-ready", input: "ready", lastUpdated: "2026-05-28", consent: "Pending", source: "Agrovesto Field Agents" },
  { id: "FQ-00256", name: "Grace Akinyi", region: "Nakuru", country: "Kenya", crop: "Wheat", phone: "+254 720 884 110", completeness: 88, tier: 4, nationalId: "27651***04", gps: true, paymentMethod: "M-Pesa", cooperative: "Nakuru Grain Co-op", credit: "ready", insurance: "ready", input: "ready", lastUpdated: "2026-06-14", consent: "Consented", source: "KIAMIS Registry" },
  { id: "FQ-00302", name: "Emmanuel Tunde", region: "Lagos", country: "Nigeria", crop: "Maize", phone: "+234 803 221 9988", completeness: 55, tier: 2, nationalId: "BVN-44**21", gps: false, paymentMethod: "Bank", cooperative: null, credit: "not-ready", insurance: "not-ready", input: "ready", lastUpdated: "2026-06-01", consent: "Not collected", source: "Nigeria NDFR" },
  { id: "FQ-00318", name: "Mary Chebet", region: "Eldoret", country: "Kenya", crop: "Maize", phone: "+254 711 002 314", completeness: 95, tier: 4, nationalId: "30912***55", gps: true, paymentMethod: "M-Pesa", cooperative: "Tegemeo SACCO", credit: "ready", insurance: "ready", input: "ready", lastUpdated: "2026-06-18", consent: "Consented", source: "M-Pesa Payment History" },
  { id: "FQ-00342", name: "Peter Mwangi", region: "Nyeri", country: "Kenya", crop: "Coffee", phone: "+254 700 112 884", completeness: 72, tier: 3, nationalId: "28443***19", gps: true, paymentMethod: "M-Pesa", cooperative: "Nyeri Coffee Co-op", credit: "ready", insurance: "not-ready", input: "ready", lastUpdated: "2026-06-10", consent: "Consented", source: "Cooperative Register" },
  { id: "FQ-00367", name: "Aisha Bello", region: "Kaduna", country: "Nigeria", crop: "Sorghum", phone: "+234 805 887 1120", completeness: 38, tier: 1, nationalId: null, gps: false, paymentMethod: "Cash", cooperative: null, credit: "not-ready", insurance: "not-ready", input: "not-ready", lastUpdated: "2026-05-22", consent: "Not collected", source: "Agrovesto Field Agents" },
];

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

export const qualityIssues = [
  { type: "Missing phone number", count: 342, severity: "destructive" as const, impact: "Blocks SMS consent and follow-up." },
  { type: "Missing GPS polygon", count: 218, severity: "destructive" as const, impact: "Blocks insurance geo-verification and KALRO weather match." },
  { type: "Missing Season 2 yield", count: 189, severity: "warning" as const, impact: "Blocks credit readiness scoring." },
  { type: "Duplicate farmer nodes", count: 12, severity: "warning" as const, impact: "Same National ID found in KIAMIS and Tegemeo." },
  { type: "Consent not collected (DPA 2019)", count: 98, severity: "destructive" as const, impact: "Blocks third-party export under Kenya DPA 2019." },
];

export const suggestedQueries = [
  "Which farmers in Machakos are members of a Tegemeo-linked cooperative with 2+ seasons of sorghum yield and at least one M-Pesa payment?",
  "Which data source has the most missing Tier 1 baseline fields?",
  "Show me all Tier 3 farmers in Kisumu eligible for input financing.",
  "Which Nigerian farmers in the Agrovesto network are missing GPS polygons?",
];

export const stats = {
  totalFarmers: 4742,
  completenessPct: 71,
  decisionReady: 3128,
  pendingActions: 23,
};

// Tier distribution across the farmer base (aligned to the 4-tier data model)
export const tierDistribution = [
  { tier: "Tier 1", label: "Identity", count: 4742, unlocks: "Registration" },
  { tier: "Tier 2", label: "Farm + Production", count: 3610, unlocks: "Cooperative & input matching" },
  { tier: "Tier 3", label: "Financial", count: 2188, unlocks: "Credit & payments" },
  { tier: "Tier 4", label: "Verified + Geo", count: 1284, unlocks: "Insurance & off-take" },
];

// GoK 6 baseline field coverage (Section 2.1 of the data approach)
export const baselineFieldCoverage = [
  { field: "National ID", coverage: 86 },
  { field: "Full Name", coverage: 99 },
  { field: "Mobile Number", coverage: 78 },
  { field: "Location", coverage: 92 },
  { field: "Land Size", coverage: 71 },
  { field: "Value Chains", coverage: 84 },
];

// Payment digitalization signal (World Bank Findex angle)
export const paymentMix = [
  { name: "M-Pesa", value: 2480, color: "var(--primary)" },
  { name: "Bank", value: 612, color: "oklch(0.65 0.08 200)" },
  { name: "Other digital", value: 290, color: "oklch(0.7 0.12 280)" },
  { name: "Cash", value: 1360, color: "oklch(0.78 0.16 75)" },
];
