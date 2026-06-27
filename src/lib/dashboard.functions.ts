import { createServerFn } from "@tanstack/react-start";
import { getNeo4jDriver } from "@/server/neo4j.server";

async function query<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const database = process.env.NEO4J_DATABASE;
  const session = getNeo4jDriver().session(database ? { database } : undefined);
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => {
      const obj: Record<string, unknown> = {};
      r.keys.forEach((k) => {
        const v = r.get(k);
        obj[k as string] =
          v && typeof v === "object" && "low" in v ? (v as { low: number }).low : v;
      });
      return obj as T;
    });
  } finally {
    await session.close();
  }
}

// ── Sources ───────────────────────────────────────────────────────────────────
export const getSources = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await query<{
    id: string; name: string; short: string; kind: string; records: number; completeness: number;
  }>("MATCH (s:Source) RETURN s.id AS id, s.name AS name, s.short AS short, s.kind AS kind, s.records AS records, s.completeness AS completeness ORDER BY s.name");
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    short: r.short ?? r.name.split(" ")[0],
    kind: r.kind ?? "Unknown",
    records: Number(r.records ?? 0),
    completeness: Number(r.completeness ?? 0),
  }));
});

// ── Activity feed ─────────────────────────────────────────────────────────────
export const getActivity = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await query<{ text: string; time: string }>(
    "MATCH (a:Activity) RETURN a.text AS text, a.time AS time ORDER BY a.time DESC LIMIT 10",
  );
  return rows.map((r) => ({
    text: r.text ?? "",
    time: r.time ? new Date(r.time).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) : "—",
  }));
});

// ── Tier distribution (computed from real farmers) ────────────────────────────
export const getTierDistribution = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await query<{ tier: number; count: number }>(
    `MATCH (f:Farmer)
     RETURN
       CASE
         WHEN f.tier = 4 OR f.tier = 'Gold'   THEN 4
         WHEN f.tier = 3                        THEN 3
         WHEN f.tier = 2 OR f.tier = 'Silver'  THEN 2
         ELSE 1
       END AS tier,
       count(f) AS count
     ORDER BY tier`,
  );
  const labels: Record<number, { label: string; unlocks: string }> = {
    1: { label: "Identity",          unlocks: "Registration" },
    2: { label: "Farm + Production", unlocks: "Cooperative & input matching" },
    3: { label: "Financial",         unlocks: "Credit & payments" },
    4: { label: "Verified + Geo",    unlocks: "Insurance & off-take" },
  };
  const map = new Map<number, number>();
  rows.forEach((r) => map.set(Number(r.tier), Number(r.count)));
  return [1, 2, 3, 4].map((t) => ({
    tier: `Tier ${t}`,
    label: labels[t].label,
    count: map.get(t) ?? 0,
    unlocks: labels[t].unlocks,
  }));
});

// ── Payment mix (computed from real farmers) ──────────────────────────────────
const PAYMENT_COLORS: Record<string, string> = {
  "M-Pesa":       "var(--primary)",
  "Bank":         "oklch(0.65 0.08 200)",
  "Other digital":"oklch(0.7 0.12 280)",
  "Cash":         "oklch(0.78 0.16 75)",
};

export const getPaymentMix = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await query<{ name: string; count: number }>(
    `MATCH (f:Farmer)-[:PREFERS_PAYMENT]->(pm:PaymentMethod)
     RETURN pm.name AS name, count(f) AS count ORDER BY count DESC`,
  );
  return rows.map((r) => ({
    name: r.name ?? "Unknown",
    value: Number(r.count),
    color: PAYMENT_COLORS[r.name ?? ""] ?? "oklch(0.6 0.1 250)",
  }));
});

// ── Baseline field coverage (computed from real farmers) ──────────────────────
export const getBaselineCoverage = createServerFn({ method: "GET" }).handler(async () => {
  const total = await query<{ c: number }>("MATCH (f:Farmer) RETURN count(f) AS c");
  const n = Number(total[0]?.c ?? 1);
  const pct = (count: number) => Math.round((count / n) * 100);

  const [nationalId, fullName, mobile, location, crop] = await Promise.all([
    query<{ c: number }>("MATCH (f:Farmer) WHERE f.nationalId IS NOT NULL AND f.nationalId <> '' RETURN count(f) AS c"),
    query<{ c: number }>("MATCH (f:Farmer) WHERE f.name IS NOT NULL AND f.name <> '' RETURN count(f) AS c"),
    query<{ c: number }>("MATCH (f:Farmer)-[:HAS_PHONE]->(p:Phone) RETURN count(DISTINCT f) AS c"),
    query<{ c: number }>("MATCH (f:Farmer)-[:LOCATED_IN]->(r:Region) RETURN count(DISTINCT f) AS c"),
    query<{ c: number }>("MATCH (f:Farmer)-[:GROWS]->(c:Crop) RETURN count(DISTINCT f) AS c"),
  ]);

  return [
    { field: "National ID",    coverage: pct(Number(nationalId[0]?.c ?? 0)) },
    { field: "Full Name",      coverage: pct(Number(fullName[0]?.c ?? 0)) },
    { field: "Mobile Number",  coverage: pct(Number(mobile[0]?.c ?? 0)) },
    { field: "Location",       coverage: pct(Number(location[0]?.c ?? 0)) },
    { field: "Land Size",      coverage: 0 }, // not captured yet
    { field: "Value Chains",   coverage: pct(Number(crop[0]?.c ?? 0)) },
  ];
});
