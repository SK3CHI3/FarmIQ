import { createServerFn } from "@tanstack/react-start";

type UploadFarmerRow = {
  name: string;
  phone: string;
  region: string;
  crop: string;
  coordinates: string;
};

type UploadIngestionInput = {
  sourceLabel: string;
  regionScope: string;
  rows: UploadFarmerRow[];
};

function slug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toFarmerId(row: UploadFarmerRow, index: number) {
  const stableKey = `${row.name}-${row.phone}-${row.region}-${index}`;
  let hash = 0;

  for (let i = 0; i < stableKey.length; i += 1) {
    hash = (hash * 31 + stableKey.charCodeAt(i)) % 100000;
  }

  return `FQ-UP-${hash.toString().padStart(5, "0")}`;
}

function cleanRow(row: UploadFarmerRow, index: number) {
  const name = row.name.trim();
  const region = row.region.trim();
  const crop = row.crop.trim();

  if (!name || !region || !crop) {
    throw new Error(`Row ${index + 1} is missing name, region, or crop.`);
  }

  return {
    id: toFarmerId(row, index),
    name,
    phone: row.phone.trim(),
    region,
    crop,
    coordinates: row.coordinates.trim(),
    country: "Kenya",
    completeness: row.coordinates.trim() ? 82 : 68,
    tier: row.coordinates.trim() ? 4 : 2,
    gps: Boolean(row.coordinates.trim()),
    lastUpdated: new Date().toISOString().slice(0, 10),
    consent: "Pending",
    creditReady: false,
    insuranceReady: Boolean(row.coordinates.trim()),
    inputReady: true,
  };
}

export const ingestUploadToNeo4j = createServerFn({ method: "POST" })
  .inputValidator((data: UploadIngestionInput) => {
    const sourceLabel = data?.sourceLabel?.trim();
    const regionScope = data?.regionScope?.trim();
    const rows = Array.isArray(data?.rows) ? data.rows : [];

    if (!sourceLabel) throw new Error("Source label is required.");
    if (!regionScope) throw new Error("Region scope is required.");
    if (!rows.length) throw new Error("At least one upload row is required.");

    return { sourceLabel, regionScope, rows };
  })
  .handler(async ({ data }) => {
    const farmers = data.rows.map(cleanRow);
    const { getNeo4jDriver } = await import("./neo4j.server");
    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `
          MERGE (source:Source { name: $sourceLabel })
          SET source.short = coalesce(source.short, $sourceShort),
              source.kind = "Upload",
              source.records = coalesce(source.records, 0) + $recordCount,
              source.lastSync = datetime()

          MERGE (regionScope:Region { id: $regionScopeId })
          SET regionScope.name = $regionScopeName,
              regionScope.country = $country

          WITH source, regionScope
          UNWIND $farmers AS row
          MERGE (farmer:Farmer { id: row.id })
          SET farmer.name = row.name,
              farmer.region = row.region,
              farmer.country = row.country,
              farmer.crop = row.crop,
              farmer.completeness = row.completeness,
              farmer.tier = row.tier,
              farmer.gps = row.gps,
              farmer.consent = row.consent,
              farmer.creditReady = row.creditReady,
              farmer.insuranceReady = row.insuranceReady,
              farmer.inputReady = row.inputReady,
              farmer.lastUpdated = row.lastUpdated,
              farmer.coordinates = row.coordinates

          MERGE (region:Region { id: row.regionId })
          SET region.name = row.region,
              region.country = row.country

          MERGE (crop:Crop { name: row.crop })
          MERGE (payment:PaymentMethod { name: "Other digital" })
          MERGE (farmer)-[:RECORDED_IN]->(source)
          MERGE (farmer)-[:LIVES_IN]->(region)
          MERGE (farmer)-[:GROWS]->(crop)
          MERGE (farmer)-[:USES_PAYMENT_METHOD]->(payment)
          MERGE (source)-[:COVERS_REGION]->(regionScope)

          WITH farmer, row
          WHERE row.phone <> ""
          MERGE (phone:Phone { value: row.phone })
          MERGE (farmer)-[:HAS_PHONE]->(phone)
          `,
          {
            sourceLabel: data.sourceLabel,
            sourceShort: data.sourceLabel.slice(0, 24),
            recordCount: farmers.length,
            regionScopeId: slug(data.regionScope),
            regionScopeName: data.regionScope,
            country: "Kenya",
            farmers: farmers.map((farmer) => ({
              ...farmer,
              regionId: `${slug(farmer.region)}-${farmer.country.toLowerCase().slice(0, 2)}`,
            })),
          },
        );
      });

      return {
        records: farmers.length,
        source: data.sourceLabel,
      };
    } catch (error) {
      console.error("Neo4j upload ingestion failed", error);
      throw new Error(
        error instanceof Error
          ? `Neo4j upload ingestion failed: ${error.message}`
          : "Neo4j upload ingestion failed. Check NEO4J_URI, NEO4J_USER/NEO4J_USERNAME, and NEO4J_PASSWORD.",
      );
    } finally {
      await session.close();
    }
  });
