import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { buildPoolConfig } from "./pool-config";

// Self-hosted PostgreSQL over standard TCP (node-postgres). Previously this
// used the Neon serverless driver over WebSocket; queries are unchanged because
// Drizzle's query layer is driver-agnostic.
const pool = new Pool(buildPoolConfig());

export const db = drizzle(pool, { schema });
