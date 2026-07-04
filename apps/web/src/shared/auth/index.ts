import { createAuthClient } from "better-auth/react";
import { config } from "@/shared/config";

/** Better Auth React client. `baseURL` is the API origin; default `basePath`
 * `/api/auth` matches the Hono mount. In dev, Vite proxies `/api` to :8787. */
export const authClient = createAuthClient({
  baseURL: config.baseUrl,
  basePath: "/api/auth",
});

export const { signIn, signUp, signOut, useSession } = authClient;
