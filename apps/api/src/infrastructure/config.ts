export interface AppConfig {
  databaseUrl: string;
  betterAuthSecret: string;
  betterAuthUrl: string;
  trustedOrigins: string[];
}

interface RawEnv {
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  TRUSTED_ORIGINS?: string;
}

/** Build validated config from an env-like object (process.env or Worker env).
 * `connectionString` (from Hyperdrive) overrides DATABASE_URL when present. */
export function loadConfig(env: RawEnv, connectionString?: string): AppConfig {
  const databaseUrl = connectionString ?? env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL (or Hyperdrive binding) is required");

  const betterAuthSecret = env.BETTER_AUTH_SECRET;
  if (!betterAuthSecret || betterAuthSecret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be set and at least 32 characters");
  }

  return {
    databaseUrl,
    betterAuthSecret,
    betterAuthUrl: env.BETTER_AUTH_URL ?? "http://localhost:8787",
    trustedOrigins: (env.TRUSTED_ORIGINS ?? "http://localhost:5173")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  };
}
