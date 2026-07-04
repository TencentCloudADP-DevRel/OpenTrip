import { createAuthClient } from "better-auth/react";
import { config } from "@/shared/config";

/** Better Auth React client pointed at the API's `/api/auth` mount. */
export const authClient = createAuthClient({
  baseURL: `${config.apiBaseUrl}/api/auth`,
});

export const { signIn, signUp, signOut, useSession } = authClient;
