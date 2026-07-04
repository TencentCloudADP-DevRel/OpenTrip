import { betterAuth } from "better-auth";
import type { Pool } from "pg";
import type { AppConfig } from "../config";

/** Build Better Auth over the shared pg pool. Email + password only. */
export function createAuth(config: AppConfig, pool: Pool) {
  return betterAuth({
    database: pool,
    secret: config.betterAuthSecret,
    baseURL: config.betterAuthUrl,
    trustedOrigins: config.trustedOrigins,
    emailAndPassword: { enabled: true },
  });
}

export type Auth = ReturnType<typeof createAuth>;
