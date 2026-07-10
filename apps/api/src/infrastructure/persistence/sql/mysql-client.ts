import mysql from "mysql2/promise";
import type {
  Pool as MysqlPool,
  PoolConnection as MysqlPoolConnection,
  QueryResult as MysqlQueryResult,
  ResultSetHeader,
  SslOptions,
} from "mysql2/promise";
import type { DatabaseSslMode } from "../../config";
import { toMysqlPlaceholders } from "./placeholders";
import type { QueryResult, SqlClient, SqlConnection } from "./types";

export interface MysqlClientOptions {
  max?: number;
  ssl?: DatabaseSslMode;
}

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
    return p;
  });
}

/**
 * Build mysql2 `ssl` option.
 * Explicit `DATABASE_SSL=off` always wins (hosts that reject TLS with
 * "Server does not support secure connection").
 */
export function resolveMysqlSsl(
  connectionString: string,
  mode: DatabaseSslMode = "off",
): SslOptions | undefined {
  if (mode === "off") return undefined;

  // Managed MySQL often needs TLS without CA pin.
  if (mode === "required") {
    return { rejectUnauthorized: false };
  }
  // mode === "verify"
  return { rejectUnauthorized: true };
}

/** Strip SSL query params so the URI does not re-enable TLS. */
function stripSslQueryParams(connectionString: string): string {
  try {
    const u = new URL(connectionString);
    for (const key of ["ssl", "sslmode", "ssl-mode", "sslaccept"]) {
      u.searchParams.delete(key);
    }
    // mysql2 URI form sometimes uses this fragment style
    return u.toString().replace(/\?$/, "");
  } catch {
    return connectionString;
  }
}

function poolConfig(
  connectionString: string,
  options?: MysqlClientOptions,
): mysql.PoolOptions {
  const mode = options?.ssl ?? "off";
  const ssl = resolveMysqlSsl(connectionString, mode);
  // When TLS is off, strip ssl* query flags so mysql2 does not enable TLS
  // from the connection string alone.
  const uri =
    mode === "off" ? stripSslQueryParams(connectionString) : connectionString;
  const max = options?.max ?? 10;
  const base: mysql.PoolOptions = {
    uri,
    connectionLimit: max,
    // Avoid holding idle sockets that Workers will freeze/close.
    maxIdle: Math.min(max, 1),
    idleTimeout: 5_000,
    waitForConnections: true,
    queueLimit: 10,
    dateStrings: false,
    supportBigNumbers: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };
  if (ssl) base.ssl = ssl;
  return base;
}

export function createMysqlClient(
  connectionString: string,
  options?: MysqlClientOptions,
): SqlClient {
  const pool = mysql.createPool(poolConfig(connectionString, options));

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
  options?: MysqlClientOptions,
): MysqlPool {
  return mysql.createPool(poolConfig(connectionString, options));
}
