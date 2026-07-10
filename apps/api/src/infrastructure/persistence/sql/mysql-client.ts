import mysql from "mysql2/promise";
import type {
  Pool as MysqlPool,
  PoolConnection as MysqlPoolConnection,
  QueryResult as MysqlQueryResult,
  ResultSetHeader,
} from "mysql2/promise";
import { toMysqlPlaceholders } from "./placeholders";
import type { QueryResult, SqlClient, SqlConnection } from "./types";

function mapResult<T>(result: MysqlQueryResult): QueryResult<T> {
  // SELECT → RowDataPacket[]; INSERT/UPDATE → ResultSetHeader
  if (Array.isArray(result)) {
    return {
      rows: result as T[],
      rowCount: result.length,
    };
  }
  const header = result as ResultSetHeader;
  return {
    rows: [] as T[],
    rowCount: header.affectedRows ?? 0,
  };
}

function normalizeParams(params: unknown[]): unknown[] {
  // mysql2 rejects nested arrays; booleans are fine as 0/1 automatically.
  return params.map((p) => {
    if (p instanceof Date) return p;
    if (typeof p === "boolean") return p ? 1 : 0;
    // Objects that are plain JSON payloads (already stringified by callers).
    return p;
  });
}

export function createMysqlClient(
  connectionString: string,
  options?: { max?: number },
): SqlClient {
  const pool = mysql.createPool({
    uri: connectionString,
    connectionLimit: options?.max ?? 10,
    // Return Date objects for DATETIME/TIMESTAMP.
    dateStrings: false,
    // JSON columns come back as objects.
    supportBigNumbers: true,
    // Match Hyperdrive / managed MySQL SSL when URL requests it.
    ssl: connectionString.includes("sslaccept=") ||
      connectionString.includes("sslmode=")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  async function runQuery<T>(
    executor: Pick<MysqlPool, "query"> | Pick<MysqlPoolConnection, "query">,
    text: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const sql = toMysqlPlaceholders(text);
    const [result] = await executor.query(sql, normalizeParams(params));
    return mapResult<T>(result);
  }

  return {
    provider: "mysql",
    query: (text, params) => runQuery(pool, text, params),
    async connect(): Promise<SqlConnection> {
      const conn = await pool.getConnection();
      return {
        query: (text, params) => runQuery(conn, text, params),
        release() {
          conn.release();
        },
      };
    },
    async end() {
      await pool.end();
    },
  };
}

/** Raw mysql2 pool for Better Auth Kysely MysqlDialect. */
export function createRawMysqlPool(
  connectionString: string,
  options?: { max?: number },
): MysqlPool {
  return mysql.createPool({
    uri: connectionString,
    connectionLimit: options?.max ?? 10,
    dateStrings: false,
    supportBigNumbers: true,
  });
}
