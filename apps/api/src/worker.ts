import { createContainer, type Container } from "./infrastructure/composition/container";
import { loadConfig, type RawEnv } from "./infrastructure/config";
import { createWorkerStorage } from "./infrastructure/storage/create-worker-storage";
import { createApp } from "./interfaces/http/app";

interface WorkerEnv extends RawEnv {
  /** Optional Hyperdrive binding. Prefer when available (pooling). */
  HYPERDRIVE?: { connectionString: string };
  /** Required when HYPERDRIVE is not bound (direct MySQL/Postgres). */
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET: string;
}

/** Minimal ExecutionContext so we do not depend on ambient Workers types. */
interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

/** Only cache when Hyperdrive owns the socket lifecycle. */
let hyperdriveCached: {
  app: ReturnType<typeof createApp>;
  container: Container;
} | null = null;

function resolveConnectionString(env: WorkerEnv): string | undefined {
  const fromHyperdrive = env.HYPERDRIVE?.connectionString?.trim();
  if (fromHyperdrive) return fromHyperdrive;
  return env.DATABASE_URL?.trim() || undefined;
}

function hasHyperdrive(env: WorkerEnv): boolean {
  return Boolean(env.HYPERDRIVE?.connectionString?.trim());
}

function buildApp(env: WorkerEnv, poolMax: number) {
  const connectionString = resolveConnectionString(env);
  const config = loadConfig(env, connectionString);
  const container = createContainer(
    config,
    createWorkerStorage(config.storage),
    { poolMax },
  );
  return { app: createApp(container), container };
}

export default {
  async fetch(
    request: Request,
    env: WorkerEnv,
    ctx: WorkerExecutionContext,
  ): Promise<Response> {
    // Hyperdrive: long-lived pool is fine.
    if (hasHyperdrive(env)) {
      if (!hyperdriveCached) {
        hyperdriveCached = buildApp(env, 5);
      }
      return hyperdriveCached.app.fetch(request);
    }

    // Direct MySQL/Postgres: Workers freeze isolates and close TCP sockets.
    // A cached mysql2 pool then fails with
    // "Can't add new command when connection is in closed state".
    // Build a fresh pool per request and dispose after the response.
    const { app, container } = buildApp(env, 1);
    try {
      return await app.fetch(request);
    } finally {
      ctx.waitUntil(
        container.dispose().catch((err) => {
          console.error("Failed to dispose DB pools:", err);
        }),
      );
    }
  },
};
