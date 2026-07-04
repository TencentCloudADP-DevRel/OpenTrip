import { createContainer, type Container } from "./infrastructure/composition/container";
import { createApp } from "./interfaces/http/app";

interface WorkerEnv {
  HYPERDRIVE: { connectionString: string };
  BASE_URL?: string;
  BETTER_AUTH_SECRET: string;
  TRUSTED_ORIGINS?: string;
}

let cached: { app: ReturnType<typeof createApp>; container: Container } | null =
  null;

function getApp(env: WorkerEnv) {
  if (!cached) {
    const container = createContainer(env, env.HYPERDRIVE.connectionString);
    cached = { app: createApp(container), container };
  }
  return cached.app;
}

export default {
  fetch(request: Request, env: WorkerEnv): Response | Promise<Response> {
    return getApp(env).fetch(request);
  },
};
