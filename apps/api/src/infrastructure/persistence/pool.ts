import type { AppConfig } from "../config";
import {
  createSqlClient,
  createRawMysqlPool,
  createRawPgPool,
  type SqlClient,
} from "./sql";

export interface AuthDatabaseHandle {
  /** Driver instance passed to Better Auth (pg.Pool | mysql2.Pool). */
  driver: unknown;
  end: () => Promise<void>;
}

/** Create the shared SqlClient used by domain repositories. */
export function createPool(
  config: AppConfig,
  options?: { max?: number },
): SqlClient {
  return createSqlClient(config.databaseProvider, config.databaseUrl, {
    max: options?.max ?? 10,
    ssl: config.databaseSsl,
  });
}

/**
 * Driver handle for Better Auth.
 * - Postgres: node-postgres `Pool`
 * - MySQL: mysql2/promise `Pool` (Kysely MysqlDialect)
 */
export function createAuthDatabase(
  config: AppConfig,
  options?: { max?: number },
): AuthDatabaseHandle {
  if (config.databaseProvider === "mysql") {
    const pool = createRawMysqlPool(config.databaseUrl, {
      max: options?.max ?? 10,
      ssl: config.databaseSsl,
    });
    return {
      driver: pool,
      end: async () => {
        await pool.end();
      },
    };
  }
  const pool = createRawPgPool(config.databaseUrl, {
    max: options?.max ?? 10,
  });
  return {
    driver: pool,
    end: async () => {
      await pool.end();
    },
  };
}

export type { SqlClient as Pool } from "./sql";
