import type { Decision, Farmer, Tier } from "@/data/sample";

export type FieldStatus = "present" | "missing" | "unverified";

export interface FieldCheck {
  field: string;
  status: FieldStatus;
  message: string;
}

export interface FarmerValidation {
  farmerId: string;
  completeness: number;
  tier: Tier;
  credit: Decision;
  insurance: Decision;
  input: Decision;
  fieldChecks: FieldCheck[];
  blockers: string[];
}

const BASELINE_FIELDS = [
  "National ID",
  "Full Name",
  "Mobile Number",
  "Location",
  "Land Size",
  "Value Chains",
] as const;

function hasValidPhone(phone: string) {
  const normalized = phone.replace(/\s/g, "");
  return normalized.length > 3 && normalized !== "—" && normalized !== "-";
}

function hasFinancialPayment(method: Farmer["paymentMethod"]) {
  return method === "M-Pesa" || method === "Bank" || method === "Other digital";
}

function hasFarmLinkage(farmer: Farmer) {
  if (farmer.cooperative) return true;
  const source = farmer.source.toLowerCase();
  return (
    source.includes("cooperative") ||
    source.includes("field") ||
    source.includes("agent") ||
    source.includes("registry")
  );
}

function checkBaselineFields(farmer: Farmer): FieldCheck[] {
  return [
    {
      field: "National ID",
      status: farmer.nationalId ? "present" : "missing",
      message: farmer.nationalId ? "National ID on file" : "No national ID recorded",
    },
    {
      field: "Full Name",
      status: farmer.name.trim() ? "present" : "missing",
      message: farmer.name.trim() ? "Full name present" : "Name is missing",
    },
    {
      field: "Mobile Number",
      status: hasValidPhone(farmer.phone) ? "present" : "missing",
      message: hasValidPhone(farmer.phone) ? "Valid phone on file" : "Phone missing or invalid",
    },
    {
      field: "Location",
      status: farmer.region && farmer.country ? "present" : "missing",
      message: farmer.region ? `${farmer.region}, ${farmer.country}` : "Location not recorded",
    },
    {
      field: "Land Size",
      status: "unverified",
      message: "Land size not captured in this source record — needs field verification",
    },
    {
      field: "Value Chains",
      status: farmer.crop.trim() ? "present" : "missing",
      message: farmer.crop.trim() ? `Primary crop: ${farmer.crop}` : "No crop / value chain recorded",
    },
  ];
}

function computeTier(farmer: Farmer, fieldChecks: FieldCheck[]): Tier {
  const hasIdentity =
    fieldChecks.find((f) => f.field === "Full Name")?.status === "present" &&
    (fieldChecks.find((f) => f.field === "National ID")?.status === "present" ||
      fieldChecks.find((f) => f.field === "Mobile Number")?.status === "present");

  if (!hasIdentity) return 1;

  const hasFarmProduction =
    fieldChecks.find((f) => f.field === "Location")?.status === "present" &&
    fieldChecks.find((f) => f.field === "Value Chains")?.status === "present" &&
    hasFarmLinkage(farmer);

  if (!hasFarmProduction) return 1;

  const hasFinancial =
    hasFinancialPayment(farmer.paymentMethod) && farmer.consent !== "Not collected";

  if (!hasFinancial) return 2;

  const isVerifiedGeo =
    farmer.gps &&
    farmer.nationalId &&
    farmer.consent === "Consented" &&
    fieldChecks.find((f) => f.field === "Mobile Number")?.status === "present";

  return isVerifiedGeo ? 4 : 3;
}

function computeCompleteness(fieldChecks: FieldCheck[]) {
  const scored = fieldChecks.filter((f) => f.status !== "unverified");
  if (!scored.length) return 0;
  const present = scored.filter((f) => f.status === "present").length;
  return Math.round((present / BASELINE_FIELDS.length) * 100);
}

function computeCredit(farmer: Farmer, tier: Tier): Decision {
  if (tier < 3) return "not-ready";
  if (!farmer.nationalId) return "not-ready";
  if (!hasFinancialPayment(farmer.paymentMethod)) return "not-ready";
  if (farmer.consent !== "Consented") return "not-ready";
  return "ready";
}

function computeInsurance(farmer: Farmer): Decision {
  if (!farmer.gps) return "not-ready";
  if (!farmer.crop.trim()) return "not-ready";
  if (!farmer.region) return "not-ready";
  if (farmer.consent === "Not collected") return "not-ready";
  return "ready";
}

function computeInput(farmer: Farmer): Decision {
  if (!farmer.crop.trim() || !farmer.region) return "not-ready";
  if (!hasFarmLinkage(farmer)) return "not-ready";
  return "ready";
}

function buildBlockers(
  farmer: Farmer,
  fieldChecks: FieldCheck[],
  credit: Decision,
  insurance: Decision,
  input: Decision,
): string[] {
  const blockers: string[] = [];

  for (const check of fieldChecks) {
    if (check.status === "missing") blockers.push(`${check.field}: ${check.message}`);
  }

  if (farmer.consent === "Not collected") {
    blockers.push("Consent not collected — blocks third-party export (Kenya DPA 2019)");
  } else if (farmer.consent === "Pending") {
    blockers.push("Consent pending — awaiting farmer confirmation");
  }

  if (credit === "not-ready") blockers.push("Credit: needs consented identity + digital payment history");
  if (insurance === "not-ready") blockers.push("Insurance: needs GPS polygon and verified location");
  if (input === "not-ready") blockers.push("Input: needs crop, region, and cooperative or agent linkage");

  return [...new Set(blockers)];
}

export function validateFarmer(farmer: Farmer): FarmerValidation {
  const fieldChecks = checkBaselineFields(farmer);
  const tier = computeTier(farmer, fieldChecks);
  const completeness = computeCompleteness(fieldChecks);
  const credit = computeCredit(farmer, tier);
  const insurance = computeInsurance(farmer);
  const input = computeInput(farmer);
  const blockers = buildBlockers(farmer, fieldChecks, credit, insurance, input);

  return {
    farmerId: farmer.id,
    completeness,
    tier,
    credit,
    insurance,
    input,
    fieldChecks,
    blockers,
  };
}

export interface QualityIssueSummary {
  type: string;
  count: number;
  severity: "destructive" | "warning";
  impact: string;
  farmerIds: string[];
}

export interface QualityScanResult {
  scannedAt: string;
  totalFarmers: number;
  averageCompleteness: number;
  issues: QualityIssueSummary[];
  validations: FarmerValidation[];
}

export function runQualityScan(farmers: Farmer[]): QualityScanResult {
  const validations = farmers.map(validateFarmer);

  const missingPhone = validations.filter((v) =>
    v.fieldChecks.some((f) => f.field === "Mobile Number" && f.status === "missing"),
  );
  const missingGps = farmers.filter((f) => !f.gps);
  const missingConsent = farmers.filter((f) => f.consent === "Not collected");
  const pendingConsent = farmers.filter((f) => f.consent === "Pending");
  const creditBlocked = validations.filter((v) => v.credit === "not-ready");
  const unverifiedLand = validations.filter((v) =>
    v.fieldChecks.some((f) => f.field === "Land Size" && f.status === "unverified"),
  );

  const duplicateIds = findDuplicateFarmerIds(farmers);

  const issues: QualityIssueSummary[] = [
    {
      type: "Missing phone number",
      count: missingPhone.length,
      severity: "destructive",
      impact: "Blocks SMS consent and follow-up.",
      farmerIds: missingPhone.map((v) => v.farmerId),
    },
    {
      type: "Missing GPS polygon",
      count: missingGps.length,
      severity: "destructive",
      impact: "Blocks insurance geo-verification and KALRO weather match.",
      farmerIds: missingGps.map((f) => f.id),
    },
    {
      type: "Land size unverified",
      count: unverifiedLand.length,
      severity: "warning",
      impact: "Blocks full KIAMIS baseline coverage scoring.",
      farmerIds: unverifiedLand.map((v) => v.farmerId),
    },
    {
      type: "Duplicate farmer nodes",
      count: duplicateIds.length,
      severity: "warning",
      impact: "Same phone or national ID found across multiple sources.",
      farmerIds: duplicateIds,
    },
    {
      type: "Consent not collected (DPA 2019)",
      count: missingConsent.length,
      severity: "destructive",
      impact: "Blocks third-party export under Kenya DPA 2019.",
      farmerIds: missingConsent.map((f) => f.id),
    },
    {
      type: "Consent pending confirmation",
      count: pendingConsent.length,
      severity: "warning",
      impact: "Farmer has not yet confirmed data sharing.",
      farmerIds: pendingConsent.map((f) => f.id),
    },
    {
      type: "Credit readiness blocked",
      count: creditBlocked.length,
      severity: "warning",
      impact: "Missing identity, payment history, or consent for credit products.",
      farmerIds: creditBlocked.map((v) => v.farmerId),
    },
  ].filter((issue) => issue.count > 0);

  const averageCompleteness =
    validations.length === 0
      ? 0
      : Math.round(
          validations.reduce((sum, v) => sum + v.completeness, 0) / validations.length,
        );

  return {
    scannedAt: new Date().toISOString(),
    totalFarmers: farmers.length,
    averageCompleteness,
    issues,
    validations,
  };
}

function findDuplicateFarmerIds(farmers: Farmer[]) {
  const seenPhones = new Map<string, string>();
  const seenIds = new Map<string, string>();
  const duplicates = new Set<string>();

  for (const farmer of farmers) {
    if (farmer.nationalId) {
      const existing = seenIds.get(farmer.nationalId);
      if (existing) {
        duplicates.add(farmer.id);
        duplicates.add(existing);
      } else {
        seenIds.set(farmer.nationalId, farmer.id);
      }
    }

    if (hasValidPhone(farmer.phone)) {
      const key = farmer.phone.replace(/\s/g, "");
      const existing = seenPhones.get(key);
      if (existing) {
        duplicates.add(farmer.id);
        duplicates.add(existing);
      } else {
        seenPhones.set(key, farmer.id);
      }
    }
  }

  return [...duplicates];
}

export function summarizeFarmersForAi(farmers: Farmer[]) {
  return farmers.map((f) => ({
    id: f.id,
    name: f.name,
    region: f.region,
    country: f.country,
    crop: f.crop,
    phone: f.phone,
    completeness: f.completeness,
    tier: f.tier,
    nationalId: f.nationalId,
    gps: f.gps,
    paymentMethod: f.paymentMethod,
    cooperative: f.cooperative,
    credit: f.credit,
    insurance: f.insurance,
    input: f.input,
    consent: f.consent,
    source: f.source,
  }));
}
