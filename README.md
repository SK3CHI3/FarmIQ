# FarmIQ

> Farmer Data Intelligence Platform — a unified dashboard and API layer that ingests, quality-checks, and monetizes smallholder farmer data for East Africa.

FarmIQ helps agribusinesses, cooperatives, and financial service providers answer one question: **"Which farmers are decision-ready, and what data is missing to get them there?"**

It brings together field registries, payment histories, cooperative records, and geo sources into a single view, then scores each farmer across a four-tier data model and six Government-of-Kenya baseline fields. The current MVP targets Kenya and Nigeria with real-world data sources such as KIAMIS, Tegemeo, Agrovesto, KALRO, and Nigeria's National Digital Farmer Registry.

---

## Table of Contents

- [What this project does](#what-this-project-does)
- [Tech stack](#tech-stack)
- [Core data model](#core-data-model)
- [Application pages](#application-pages)
- [Architecture](#architecture)
- [Database: Neo4j](#database-neo4j)
  - [Why a graph database](#why-a-graph-database)
  - [Neo4j schema migration (Cypher)](#neo4j-schema-migration-cypher)
  - [SQL table → Neo4j mapping](#sql-table--neo4j-mapping)
  - [Common Cypher queries](#common-cypher-queries)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Deployment notes](#deployment-notes)
- [Contributing](#contributing)

---

## What this project does

Smallholder agriculture is fragmented. A single farmer may exist in a government registry, a cooperative spreadsheet, a mobile-money wallet, and a satellite field map — but none of those systems talk to each other. FarmIQ fixes that by:

1. **Ingesting** multiple data sources through CSV upload, API connectors, webhooks, and graph sync.
2. **Linking** records to a single farmer identity using a graph database (Neo4j).
3. **Scoring** completeness against a 4-tier model and 6 GoK baseline fields.
4. **Flagging** quality issues (missing phones, missing GPS, duplicates, consent gaps).
5. **Enabling decisions** — credit, insurance, and input financing readiness — so partners can act on the data.

### MVP scope

- 7 primary data sources: KIAMIS Registry, Tegemeo Cooperative Register, Agrovesto Field Agents, M-Pesa Payment History, KALRO Satellite/Weather, Nigeria NDFR, AgStack Field Registry.
- 2 countries: Kenya, Nigeria.
- 3 readiness decisions: Credit, Insurance, Input.
- 4 farmer tiers.
- 6 GoK baseline fields: National ID, Full Name, Mobile Number, Location, Land Size, Value Chains.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | [TanStack Start](https://tanstack.com/start) (React + Vite + file-based routing) |
| UI | [React 19](https://react.dev), [shadcn/ui](https://ui.shadcn.com), [Tailwind CSS v4](https://tailwindcss.com) |
| Charts | [Recharts](https://recharts.org) |
| Forms | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) |
| Database | [Neo4j](https://neo4j.com) (graph DB) + optional Supabase Postgres mirror |
| Icons | [Lucide React](https://lucide.dev) |

TanStack Start gives us SSR/SSG, server functions for backend logic, and type-safe routing out of the box. The app is built as a modern edge-ready React application rather than a traditional SPA or Next.js app.

---

## Core data model

### Farmer tiers

A farmer is classified into one of four tiers based on how much verified data has been collected.

| Tier | Name | Unlocks |
|------|------|---------|
| 1 | Identity | Registration only |
| 2 | Farm + Production | Cooperative & input matching |
| 3 | Financial | Credit & payments |
| 4 | Verified + Geo | Insurance & off-take |

### Decision readiness

Each farmer can be `ready` or `not-ready` for three product decisions:

- **Credit** — needs identity, financial track record, and consent.
- **Insurance** — needs GPS polygon, crop data, and location verification.
- **Input** — needs crop, land size, and cooperative or agent linkage.

### Baseline field coverage (GoK / KIAMIS)

The Government of Kenya's Ministry of Agriculture, Livestock, Fisheries and Cooperatives (MoALFC) defines six baseline fields for KIAMIS registration. FarmIQ tracks coverage per field:

1. National ID
2. Full Name
3. Mobile Number
4. Location
5. Land Size
6. Value Chains

### Farmer entity

```ts
interface Farmer {
  id: string;                 // FarmIQ unique identifier
  name: string;
  region: string;
  country: "Kenya" | "Nigeria";
  crop: string;
  phone: string;
  completeness: number;       // 0-100 data completeness score
  tier: 1 | 2 | 3 | 4;
  nationalId: string | null;
  gps: boolean;                // has GPS polygon / coordinates
  paymentMethod: "M-Pesa" | "Bank" | "Cash" | "Other digital";
  cooperative: string | null;
  credit: "ready" | "not-ready";
  insurance: "ready" | "not-ready";
  input: "ready" | "not-ready";
  lastUpdated: string;
  consent: "Consented" | "Pending" | "Not collected";
  source: string;              // originating data source
}
```

---

## Application pages

| Route | Purpose |
|-------|---------|
| `/` | Dashboard — data health, readiness, tier funnel, payment mix, baseline coverage, attention list |
| `/analytics` | Compare sources, regions, countries, and readiness across dimensions |
| `/farmers` | Full farmer records table with profile sheets and flagging |
| `/data-quality` | Quality issues, duplicate review, consent management, merge tooling |
| `/intelligence` | Natural-language / Cypher query interface, saved insights, GraphRAG signals |
| `/connections` | Connect Neo4j, Supabase, Google Sheets, S3, webhooks, WhatsApp |
| `/upload` | CSV ingestion wizard with column mapping and preview |
| `/settings` | Organization, members, integrations, danger zone |

---

## Architecture

```text
┌─────────────────────────────────────┐
│          React / TanStack Start      │
│  Dashboard · Analytics · Upload      │
│  Connections · Settings · Intelligence │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      TanStack Server Functions       │
│  Auth · Ingestion · Graph Queries    │
│  Webhooks · Quality Checks           │
└──────────────┬──────────────────────┘
               │
   ┌───────────┴───────────┐
   │                       │
┌──▼─────┐          ┌──────▼─────────┐
│ Neo4j  │          │ Supabase       │
│ Graph  │◄────────►│ Postgres       │
│ Store  │  sync    │ (mirror)       │
└────────┘          └────────────────┘
```

- **Frontend** routes live in `src/routes/` and are auto-registered by TanStack Router.
- **Shared components** live in `src/components/`.
- **Sample data** for the MVP UI lives in `src/data/sample.ts`.
- **Server functions** are authored with `createServerFn` from `@tanstack/react-start` and called from components.
- **Public API endpoints** (webhooks, cron) go under `src/routes/api/public/`.

---

## Database: Neo4j

### Why a graph database

Farmer data is inherently relational. A farmer belongs to a cooperative, owns a farm, has a payment wallet, transacts with an agent, and may be linked to other farmers through family or group ties. A relational schema would need many junction tables and becomes painful to query for relationship-heavy questions like:

- "Which farmers in a Tegemeo-linked cooperative have 2+ seasons of sorghum yield and at least one M-Pesa payment?"
- "Find duplicate farmer nodes that share a national ID or phone number across two sources."
- "Which cooperative has the highest share of credit-ready farmers?"

Neo4j stores these as **nodes** and **relationships**, making graph traversals and identity resolution fast and expressive.

### Neo4j schema migration (Cypher)

Run the following Cypher statements against a fresh Neo4j instance to create the equivalent of a SQL schema migration. This sets constraints, indexes, and a base graph model for the MVP.

```cypher
-- ============================================================
-- FarmIQ Neo4j Schema Migration
-- Equivalent to: CREATE TABLE, CREATE INDEX, ALTER TABLE ...
-- ============================================================

-- 1. Constraints (unique IDs / required fields)
CREATE CONSTRAINT farmer_id IF NOT EXISTS
  FOR (f:Farmer) REQUIRE f.id IS UNIQUE;

CREATE CONSTRAINT source_name IF NOT EXISTS
  FOR (s:Source) REQUIRE s.name IS UNIQUE;

CREATE CONSTRAINT region_id IF NOT EXISTS
  FOR (r:Region) REQUIRE r.id IS UNIQUE;

CREATE CONSTRAINT cooperative_id IF NOT EXISTS
  FOR (c:Cooperative) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT crop_name IF NOT EXISTS
  FOR (cr:Crop) REQUIRE cr.name IS UNIQUE;

CREATE CONSTRAINT phone_value IF NOT EXISTS
  FOR (p:Phone) REQUIRE p.value IS UNIQUE;

CREATE CONSTRAINT national_id_value IF NOT EXISTS
  FOR (n:NationalId) REQUIRE n.value IS UNIQUE;

-- 2. Indexes for fast lookup
CREATE INDEX farmer_name_idx IF NOT EXISTS
  FOR (f:Farmer) ON (f.name);

CREATE INDEX farmer_tier_idx IF NOT EXISTS
  FOR (f:Farmer) ON (f.tier);

CREATE INDEX farmer_country_idx IF NOT EXISTS
  FOR (f:Farmer) ON (f.country);

CREATE INDEX farmer_consent_idx IF NOT EXISTS
  FOR (f:Farmer) ON (f.consent);

-- 3. Full-text index for farmer search
CREATE FULLTEXT INDEX farmerSearch IF NOT EXISTS
  FOR (f:Farmer) ON EACH [f.name, f.region, f.crop];
```

### Node and relationship model

```cypher
-- Core node labels and properties
--
-- (:Farmer)        { id, name, tier, completeness, gps, consent, creditReady, insuranceReady, inputReady, lastUpdated }
-- (:Source)        { name, kind, short, completeness, records }
-- (:Region)        { id, name, country }
-- (:Cooperative)   { id, name }
-- (:Crop)          { name }
-- (:Phone)         { value }
-- (:NationalId)    { value, masked }
-- (:PaymentMethod) { name }
-- (:BaselineField) { name, coverage }
-- (:DataPoint)     { field, value, verifiedAt }
--
-- Relationships
-- (:Farmer)-[:RECORDED_IN]->(:Source)
-- (:Farmer)-[:LIVES_IN]->(:Region)
-- (:Farmer)-[:MEMBER_OF]->(:Cooperative)
-- (:Farmer)-[:GROWS]->(:Crop)
-- (:Farmer)-[:HAS_PHONE]->(:Phone)
-- (:Farmer)-[:HAS_NATIONAL_ID]->(:NationalId)
-- (:Farmer)-[:USES_PAYMENT_METHOD]->(:PaymentMethod)
-- (:Farmer)-[:HAS_FIELD { coveragePct }]->(:BaselineField)
-- (:Farmer)-[:SIMILAR_TO { reason, score }]->(:Farmer)   // duplicate detection
-- (:Source)-[:FEEDS_INTO]->(:Source)                     // lineage / ETL chain
```

### Seed data (Cypher equivalent to SQL INSERT)

```cypher
-- Create sources
UNWIND [
  { name: "KIAMIS Registry", short: "KIAMIS", kind: "Government", completeness: 91, records: 1580 },
  { name: "Tegemeo Cooperative Register", short: "Tegemeo", kind: "Cooperative", completeness: 78, records: 880 },
  { name: "Agrovesto Field Agents", short: "Agrovesto", kind: "Field", completeness: 64, records: 612 },
  { name: "M-Pesa Payment History", short: "M-Pesa", kind: "Payments", completeness: 82, records: 1240 },
  { name: "KALRO Satellite / Weather", short: "KALRO", kind: "Geo", completeness: 70, records: 950 },
  { name: "Nigeria NDFR", short: "NDFR", kind: "Government", completeness: 58, records: 430 },
  { name: "AgStack Field Registry", short: "AgStack", kind: "Geo", completeness: 66, records: 510 }
] AS s
CREATE (src:Source { name: s.name, short: s.short, kind: s.kind, completeness: s.completeness, records: s.records });

-- Create regions
UNWIND [
  { id: "machakos-ke", name: "Machakos", country: "Kenya" },
  { id: "kisumu-ke", name: "Kisumu", country: "Kenya" },
  { id: "nakuru-ke", name: "Nakuru", country: "Kenya" },
  { id: "eldoret-ke", name: "Eldoret", country: "Kenya" },
  { id: "nyeri-ke", name: "Nyeri", country: "Kenya" },
  { id: "kano-ng", name: "Kano", country: "Nigeria" },
  { id: "lagos-ng", name: "Lagos", country: "Nigeria" },
  { id: "kaduna-ng", name: "Kaduna", country: "Nigeria" }
] AS r
CREATE (reg:Region { id: r.id, name: r.name, country: r.country });

-- Create cooperatives
UNWIND [
  { id: "tegemeo", name: "Tegemeo SACCO" },
  { id: "nakuru-grain", name: "Nakuru Grain Co-op" },
  { id: "nyeri-coffee", name: "Nyeri Coffee Co-op" }
] AS c
CREATE (coop:Cooperative { id: c.id, name: c.name });

-- Create crops and payment methods
UNWIND ["Maize", "Sorghum", "Millet", "Wheat", "Coffee"] AS cropName
CREATE (:Crop { name: cropName });

UNWIND ["M-Pesa", "Bank", "Cash", "Other digital"] AS pm
CREATE (:PaymentMethod { name: pm });
```

### SQL table → Neo4j mapping

If you are coming from a relational schema, here is the mental model mapping.

| SQL Concept | Neo4j Equivalent |
|-------------|------------------|
| `CREATE TABLE` | `CREATE (n:Label { properties })` |
| `PRIMARY KEY` | `CREATE CONSTRAINT ... REQUIRE property IS UNIQUE` |
| `CREATE INDEX` | `CREATE INDEX ... FOR (n:Label) ON (n.property)` |
| `FOREIGN KEY` | `CREATE (a)-[:REL_TYPE]->(b)` |
| `JOIN` | Graph traversal `MATCH (a)-[:REL]->(b)` |
| `INSERT INTO` | `CREATE` or `MERGE` |
| `UPDATE` | `SET n.property = value` |
| `GROUP BY` | `RETURN ... aggregate` with `WITH` |
| Recursive CTE | Native traversal `[:REL*1..3]` |
| Full-text search | `CREATE FULLTEXT INDEX` + `CALL db.index.fulltext.queryNodes` |

### Common Cypher queries

```cypher
-- Find all credit-ready farmers in Machakos who are Tegemeo members
MATCH (f:Farmer)-[:LIVES_IN]->(r:Region { name: "Machakos" })
MATCH (f)-[:MEMBER_OF]->(c:Cooperative { name: "Tegemeo SACCO" })
WHERE f.creditReady = true
RETURN f.id, f.name, f.tier, f.completeness
ORDER BY f.completeness DESC;

-- Duplicate detection: same national ID across two sources
MATCH (f1:Farmer)-[:HAS_NATIONAL_ID]->(n:NationalId)<-[:HAS_NATIONAL_ID]-(f2:Farmer)
MATCH (f1)-[:RECORDED_IN]->(s1:Source), (f2)-[:RECORDED_IN]->(s2:Source)
WHERE s1 <> s2
RETURN n.value AS nationalId,
       f1.id AS id1, f1.name AS name1, s1.name AS source1,
       f2.id AS id2, f2.name AS name2, s2.name AS source2;

-- Data completeness by source (matches the dashboard bar chart)
MATCH (f:Farmer)-[:RECORDED_IN]->(s:Source)
RETURN s.name AS source, s.completeness AS completeness, count(f) AS records
ORDER BY completeness DESC;

-- Farmers needing attention (lowest completeness first)
MATCH (f:Farmer)
RETURN f.id, f.name, f.region, f.completeness, f.creditReady, f.insuranceReady, f.inputReady
ORDER BY f.completeness ASC
LIMIT 5;

-- Baseline field coverage for a single farmer
MATCH (f:Farmer { id: "FQ-00142" })-[h:HAS_FIELD]->(bf:BaselineField)
RETURN bf.name AS field, h.coveragePct AS coverage;

-- Full-text search across farmer names
CALL db.index.fulltext.queryNodes("farmerSearch", "Amina Machakos") YIELD node
RETURN node.id, node.name, node.region, node.country;
```

---

## Getting started

### Prerequisites

- [Bun](https://bun.sh) (or Node.js 20+)
- A Neo4j instance (AuraDB, local Docker, or self-hosted)
- Optional: Supabase project for SQL mirroring

### Install dependencies

```bash
bun install
```

### Run the dev server

```bash
bun dev
```

The app will be available at `http://localhost:8080` by default.

### Build for production

```bash
bun run build
```

---

## Environment variables

Create a `.env` file in the project root. Values are read server-side in TanStack Start handlers and public variables are prefixed with `VITE_`.

```bash
# Neo4j connection
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-secure-password

# Optional Supabase mirror
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Public config
VITE_APP_NAME=FarmIQ
VITE_API_BASE_URL=/api/v1
```

> **Security note:** never commit the `.env` file. The service role key must only be used inside server functions or admin routes, never in the browser.

---

## Deployment notes

This is a TanStack Start application deployed to **Netlify** with SSR via `@netlify/vite-plugin-tanstack-start`. Keep the following in mind:

- Do **not** create `entry-client.tsx` or `entry-server.tsx` — TanStack Start v1 handles this automatically.
- Server functions live in `*.functions.ts` files or directly inside route handlers.
- Public API endpoints for webhooks/cron should be placed under `src/routes/api/public/`.
- Build settings are defined in `netlify.toml` (`npm run build`, publish `dist/client`).
- Deploy with the Netlify CLI: `npx netlify deploy` (use `--prod` for production).

---

## Contributing

1. Keep components small and focused in `src/components/`.
2. Follow the existing design token system — no hardcoded colors in components.
3. Add new routes as files in `src/routes/`; the router auto-registers them.
4. Update this README when the data model or Neo4j schema changes.
5. Run `npm run lint` and `npm run build` before opening a PR.

---

## License

Proprietary — FarmIQ is built for internal Agrovesto / FarmIQ use.

---

*Built with React, Vite, TanStack Start, shadcn/ui, Tailwind, and Neo4j.*
