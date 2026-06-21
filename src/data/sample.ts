export type Decision = "ready" | "not-ready";

export interface Farmer {
  id: string;
  name: string;
  region: string;
  country: "Kenya" | "Nigeria";
  crop: string;
  phone: string;
  completeness: number;
  credit: Decision;
  insurance: Decision;
  input: Decision;
  lastUpdated: string;
  consent: "Consented" | "Pending" | "Not collected";
  source: string;
}

export const farmers: Farmer[] = [
  { id: "FQ-00142", name: "Amina Wanjiku", region: "Machakos", country: "Kenya", crop: "Maize", phone: "+254 712 884 221", completeness: 91, credit: "ready", insurance: "ready", input: "ready", lastUpdated: "2026-06-12", consent: "Consented", source: "Field Agent Export — March" },
  { id: "FQ-00187", name: "James Ochieng", region: "Kisumu", country: "Kenya", crop: "Sorghum", phone: "+254 733 552 109", completeness: 67, credit: "ready", insurance: "not-ready", input: "ready", lastUpdated: "2026-06-09", consent: "Consented", source: "Tegemeo Cooperative Register" },
  { id: "FQ-00231", name: "Fatima Musa", region: "Kano", country: "Nigeria", crop: "Millet", phone: "—", completeness: 44, credit: "not-ready", insurance: "not-ready", input: "ready", lastUpdated: "2026-05-28", consent: "Pending", source: "NGO Registry CSV" },
  { id: "FQ-00256", name: "Grace Akinyi", region: "Nakuru", country: "Kenya", crop: "Wheat", phone: "+254 720 884 110", completeness: 88, credit: "ready", insurance: "ready", input: "ready", lastUpdated: "2026-06-14", consent: "Consented", source: "Field Agent Export — March" },
  { id: "FQ-00302", name: "Emmanuel Tunde", region: "Lagos", country: "Nigeria", crop: "Maize", phone: "+234 803 221 9988", completeness: 55, credit: "not-ready", insurance: "not-ready", input: "ready", lastUpdated: "2026-06-01", consent: "Not collected", source: "Lagos State Registry" },
  { id: "FQ-00318", name: "Mary Chebet", region: "Eldoret", country: "Kenya", crop: "Maize", phone: "+254 711 002 314", completeness: 95, credit: "ready", insurance: "ready", input: "ready", lastUpdated: "2026-06-18", consent: "Consented", source: "Field Agent Export — March" },
  { id: "FQ-00342", name: "Peter Mwangi", region: "Nyeri", country: "Kenya", crop: "Coffee", phone: "+254 700 112 884", completeness: 72, credit: "ready", insurance: "not-ready", input: "ready", lastUpdated: "2026-06-10", consent: "Consented", source: "Cooperative Register" },
  { id: "FQ-00367", name: "Aisha Bello", region: "Kaduna", country: "Nigeria", crop: "Sorghum", phone: "+234 805 887 1120", completeness: 38, credit: "not-ready", insurance: "not-ready", input: "not-ready", lastUpdated: "2026-05-22", consent: "Not collected", source: "NGO Registry CSV" },
];

export const dataSources = [
  { name: "Field Agent Export — March", completeness: 86, records: 1240 },
  { name: "Tegemeo Cooperative Register", completeness: 72, records: 880 },
  { name: "NGO Registry CSV", completeness: 48, records: 612 },
  { name: "Lagos State Registry", completeness: 58, records: 430 },
  { name: "Kenya Farmers Registry", completeness: 91, records: 1580 },
];

export const activityFeed = [
  { time: "12 min ago", text: "CSV uploaded — 340 new records from Kaduna field team" },
  { time: "1 hr ago", text: "AI deduplication found 12 conflicts in NGO Registry CSV" },
  { time: "3 hr ago", text: "Loan officer viewed farmer profile: James Ochieng" },
  { time: "Yesterday", text: "Export generated: 47 credit-ready farmers (Machakos)" },
  { time: "Yesterday", text: "Consent SMS batch sent to 98 farmers" },
];

export const qualityIssues = [
  { type: "Missing phone number", count: 342, severity: "destructive" as const, impact: "Blocks SMS consent and follow-up." },
  { type: "Missing GPS coordinates", count: 218, severity: "destructive" as const, impact: "Blocks insurance geo-verification." },
  { type: "Missing Season 2 yield", count: 189, severity: "warning" as const, impact: "Blocks credit readiness scoring." },
  { type: "Duplicate records", count: 12, severity: "warning" as const, impact: "Record pairs matched across two sources." },
  { type: "Consent not collected", count: 98, severity: "destructive" as const, impact: "Flagged before third-party data sharing." },
];

export const suggestedQueries = [
  "Which farmers in Machakos are maize-ready but have no insurance coverage?",
  "Which data source has the most missing fields?",
  "Show me all farmers linked to Tegemeo cooperative with incomplete yield records.",
  "Which Nigerian farmers are input-ready this season?",
];

export const stats = {
  totalFarmers: 4742,
  completenessPct: 71,
  decisionReady: 3128,
  pendingActions: 23,
};
