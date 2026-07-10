import type { DatabaseProvider, SqlClient } from "./types";
import { createPostgresClient } from "./postgres-client";
import { createMysqlClient } from "./mysql-client";

export function createSqlClient(
  provider: DatabaseProvider,
  connectionString: string,
  options?: { max?: number },
): SqlClient {
  if (provider === "mysql") {
    return createMysqlClient(connectionString, options);
  }
  return createPostgresClient(connectionString, options);
}
