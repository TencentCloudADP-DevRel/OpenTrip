import { createAuthClient } from "better-auth/react";
import {
  emailOTPClient,
  inferAdditionalFields,
  twoFactorClient,
} from "better-auth/client/plugins";
import { config } from "@/shared/config";

/** Set by AuthForm so twoFactorClient can switch the UI without a full reload. */
let onTwoFactorRequired: (() => void) | null = null;

export function setTwoFactorRequiredHandler(handler: (() => void) | null): void {
  onTwoFactorRequired = handler;
}

/** Better Auth React client. `baseURL` is the API origin; default `basePath`
 * `/api/auth` matches the Hono mount. In dev, Vite proxies `/api` to :8780.
 *
 * `inferAdditionalFields` mirrors the server's `user.additionalFields` so
 * `session.user.defaultCurrency` is typed on the client. The API lives in a
 * separate package, so the field shape is declared explicitly rather than
 * inferred from the server `auth` instance.
 *
 * `emailOTPClient` enables OTP send/verify for email registration and change.
 * `twoFactorClient` handles TOTP enrollment and the post-sign-in challenge. */
export const authClient = createAuthClient({
  baseURL: config.baseUrl,
  basePath: "/api/auth",
  plugins: [
    emailOTPClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        onTwoFactorRequired?.();
      },
    }),
    inferAdditionalFields({
      user: {
        defaultCurrency: {
          type: "string",
          required: false,
          input: true,
        },
        twoFactorEnabled: {
          type: "boolean",
          required: false,
          input: false,
        },
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
