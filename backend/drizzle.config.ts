import type { Config } from "drizzle-kit";
import "dotenv/config";
import { buildPoolConfig } from "./src/db/pool-config";

const { connectionString, ssl } = buildPoolConfig();

export default {
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString as string,
    ssl,
  },
  strict: true,
  verbose: true,
} satisfies Config;
