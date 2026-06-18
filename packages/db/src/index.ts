import { env } from "@algorithm-tracker/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

// biome-ignore lint/performance/noNamespaceImport: drizzle requires namespace schema object
import * as schema from "./schema";

export function createDb() {
	return drizzle(env.DATABASE_URL, { schema });
}

export const db = createDb();

// biome-ignore lint/performance/noBarrelFile: consumers need direct table references for queries
export * from "./schema";
