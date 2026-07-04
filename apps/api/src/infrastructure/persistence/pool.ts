import pg from "pg";

/** Create a shared connection pool. One pool backs both Better Auth and the
 * domain repositories. */
export function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString, max: 10 });
}

export type { Pool } from "pg";
