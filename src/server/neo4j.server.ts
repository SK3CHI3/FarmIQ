import neo4j, { type Driver } from "neo4j-driver";

let driver: Driver | null = null;

function getNeo4jConfig() {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USERNAME ?? process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !user || !password) {
    throw new Error(
      "Neo4j is not configured. Set NEO4J_URI, NEO4J_USERNAME (or NEO4J_USER), and NEO4J_PASSWORD in .env.",
    );
  }

  return { uri, user, password };
}

export function getNeo4jDriver() {
  if (!driver) {
    const { uri, user, password } = getNeo4jConfig();
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }

  return driver;
}
