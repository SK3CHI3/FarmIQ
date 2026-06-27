import { createServerFn } from "@tanstack/react-start";
import { getNeo4jDriver } from "./neo4j.server";
import type { Farmer } from "@/data/sample";

// ── Neo4j row shape ───────────────────────────────────────────────────────────

interface FarmerRow {
  id: string;
  name: string;
  creditReady: boolean;
  tier: string; // "Gold" | "Silver" | ...
  region: string;
  country: string;
  crop: string;
  phone: string;
  payment: string;
  source: string;
}

function mapTier(tier: string): Farmer["tier"] {
  const t = (tier ?? "").toLowerCase();
  if (t === "gold" || t === "4") return 4;
  if (t === "3") return 3;
  if (t === "silver" || t === "2") return 2;
  return 1;
}

function mapPayment(payment: string): Farmer["paymentMethod"] {
  const p = (payment ?? "").toLowerCase();
  if (p.includes("mobile") || p.includes("mpesa") || p.includes("m-pesa")) return "M-Pesa";
  if (p.includes("bank")) return "Bank";
  if (p.includes("cash")) return "Cash";
  return "Other digital";
}

function rowToFarmer(row: FarmerRow): Farmer {
  const tierNum = mapTier(row.tier);
  const payment = mapPayment(row.payment);
  const credit: Farmer["credit"] = row.creditReady ? "ready" : "not-ready";
  const insurance: Farmer["insurance"] =
    credit === "ready" ? "ready" : "not-ready";
  const input: Farmer["input"] =
    row.crop && row.region ? "ready" : "not-ready";

  const fields = [row.name, row.region, row.country, row.crop, row.phone, row.payment, row.source];
  const completeness = Math.round((fields.filter((f) => f && f !== "—").length / fields.length) * 100);

  return {
    id: row.id,
    name: row.name ?? "Unknown",
    region: row.region ?? "Unknown",
    country: row.country === "Nigeria" ? "Nigeria" : "Kenya",
    crop: row.crop ?? "Unknown",
    phone: row.phone ?? "—",
    completeness,
    tier: tierNum,
    nationalId: null,
    gps: false,
    paymentMethod: payment,
    cooperative: null,
    credit,
    insurance,
    input,
    lastUpdated: new Date().toISOString().split("T")[0],
    consent: "Consented",
    source: row.source ?? "Neo4j",
  };
}

export const getFarmers = createServerFn({ method: "GET" }).handler(async () => {
  const database = process.env.NEO4J_DATABASE;
  const session = getNeo4jDriver().session(database ? { database } : undefined);

  try {
    const result = await session.run(`
      MATCH (f:Farmer)
      OPTIONAL MATCH (f)-[:LOCATED_IN|LIVES_IN]->(r:Region)
      OPTIONAL MATCH (f)-[:GROWS]->(c:Crop)
      OPTIONAL MATCH (f)-[:HAS_PHONE]->(p:Phone)
      OPTIONAL MATCH (f)-[:PREFERS_PAYMENT|USES_PAYMENT_METHOD]->(pm:PaymentMethod)
      OPTIONAL MATCH (f)-[:REGISTERED_VIA|RECORDED_IN]->(s:Source)
      RETURN
        f.id          AS id,
        f.name        AS name,
        f.creditReady AS creditReady,
        f.tier        AS tier,
        r.name        AS region,
        r.country     AS country,
        c.name        AS crop,
        p.value       AS phone,
        pm.name       AS payment,
        s.name        AS source
    `);

    return result.records.map((rec) => {
      const row: FarmerRow = {
        id: rec.get("id") as string,
        name: rec.get("name") as string,
        creditReady: Boolean(rec.get("creditReady")),
        tier: String(rec.get("tier") ?? ""),
        region: rec.get("region") as string,
        country: rec.get("country") as string,
        crop: rec.get("crop") as string,
        phone: rec.get("phone") as string,
        payment: rec.get("payment") as string,
        source: rec.get("source") as string,
      };
      return rowToFarmer(row);
    });
  } finally {
    await session.close();
  }
});
