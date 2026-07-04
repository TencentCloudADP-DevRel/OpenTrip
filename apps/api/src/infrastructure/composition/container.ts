import { TripService } from "../../application";
import { createPool, type Pool } from "../persistence/pool";
import { PgTripRepository } from "../persistence/trip-repository.pg";
import { createAuth, type Auth } from "../auth/auth";
import { loadConfig, type AppConfig } from "../config";

export interface Container {
  config: AppConfig;
  pool: Pool;
  auth: Auth;
  tripService: TripService;
}

interface RawEnv {
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  TRUSTED_ORIGINS?: string;
}

/** Wire the object graph. `connectionString` is supplied by Hyperdrive on
 * Workers; on Node it comes from DATABASE_URL. */
export function createContainer(env: RawEnv, connectionString?: string): Container {
  const config = loadConfig(env, connectionString);
  const pool = createPool(config.databaseUrl);
  const auth = createAuth(config, pool);
  const tripService = new TripService(new PgTripRepository(pool));
  return { config, pool, auth, tripService };
}
