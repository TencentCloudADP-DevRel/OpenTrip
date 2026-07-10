import pg from "pg";
import type { QueryResult, SqlClient, SqlConnection } from "./types";

export function createPostgresClient(
  connectionString: string,
  options?: { max?: number },
): SqlClient {
  const pool = new pg.Pool({
    connectionString,
    max: options?.max ?? 10,
  });

  return {
    provider: "postgres",
    async query<T = Record<string, unknown>>(
      text: string,
      params: unknown[] = [],
    ): Promise<QueryResult<T>> {
      const result = await pool.query(text, params);
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount ?? 0,
      };
    },
    async connect(): Promise<SqlConnection> {
      const client = await pool.connect();
      return {
        async query<T = Record<string, unknown>>(
          text: string,
          params: unknown[] = [],
        ): Promise<QueryResult<T>> {
          const result = await client.query(text, params);
          return {
            rows: result.rows as T[],
            rowCount: result.rowCount ?? 0,
          };
        },
        release() {
          client.release();
        },
      };
    },
    async end() {
      await pool.end();
    },
  };
}

/** Expose the raw pg Pool for Better Auth (expects a node-postgres Pool). */
export function createRawPgPool(
  connectionString: string,
  options?: { max?: number },
): pg.Pool {
  return new pg.Pool({
    connectionString,
    max: options?.max ?? 10,
  });
}
