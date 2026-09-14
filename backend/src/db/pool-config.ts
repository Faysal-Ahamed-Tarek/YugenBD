import "dotenv/config";
import fs from "node:fs";
import type { PoolConfig } from "pg";

// Shared node-postgres Pool configuration for every DB entry point (app client,
// migration runner). Centralised so SSL handling stays consistent.
//
// SSL is driven by DATABASE_SSL:
//   disable  -> plain TCP, no TLS (e.g. Postgres on localhost / private LAN)
//   require  -> TLS on, certificate NOT verified (self-signed cert; the common
//               case for a self-hosted DB reached over the public network)
//   verify   -> TLS on, certificate verified against DATABASE_SSL_CA (a CA/cert
//               file path). Use this once you have a real cert/CA in place.
// Falls back to "require" when a remote sslmode=require is in the URL, else
// "disable". An explicit DATABASE_SSL always wins.
export function buildPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const mode = (process.env.DATABASE_SSL ?? inferSslMode(connectionString)).toLowerCase();

  let ssl: PoolConfig["ssl"] = false;
  if (mode === "require") {
    ssl = { rejectUnauthorized: false };
  } else if (mode === "verify") {
    const caPath = process.env.DATABASE_SSL_CA;
    ssl = caPath
      ? { rejectUnauthorized: true, ca: fs.readFileSync(caPath, "utf8") }
      : { rejectUnauthorized: true };
  } else if (mode !== "disable") {
    throw new Error(`Invalid DATABASE_SSL="${mode}" (expected disable | require | verify)`);
  }

  return { connectionString, ssl };
}

function inferSslMode(connectionString: string): "require" | "disable" {
  return /[?&]sslmode=require/i.test(connectionString) ? "require" : "disable";
}
