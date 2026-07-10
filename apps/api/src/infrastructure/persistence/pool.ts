import type { AppConfig } from "../config";
import {
  createSqlClient,
  createRawMysqlPool,
  createRawPgPool,
  type SqlClient,
} from "./sql";

/** Create the shared SqlClient used by domain repositories. */
export function createPool(
  databaseUrl: string,
  provider: AppConfig["databaseProvider"] = "postgres",
): SqlClient {
  return createSqlClient(provider, databaseUrl);
}

/**
 * Driver handle for Better Auth.
 * - Postgres: node-postgres `Pool`
 * - MySQL: mysql2/promise `Pool` (Kysely MysqlDialect)
 */
export function createAuthDatabase(
  databaseUrl: string,
  provider: AppConfig["databaseProvider"],
): unknown {
  if (provider === "mysql") {
    return createRawMysqlPool(databaseUrl);
  }
  return createRawPgPool(databaseUrl);
}

export type { SqlClient as Pool } from "./sql";
