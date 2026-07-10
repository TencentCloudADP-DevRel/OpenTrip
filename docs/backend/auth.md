# Authentication (Better Auth)

Reference: [../reference/backend-sources.md](../reference/backend-sources.md).

## Configuration

`apps/api/src/infrastructure/auth/auth.ts` builds Better Auth with the shared
`pg.Pool`:

```ts
export const auth = betterAuth({
  database: pool,               // pg.Pool
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },
  socialProviders: config.googleOAuth
    ? {
        google: {
          clientId: config.googleOAuth.clientId,
          clientSecret: config.googleOAuth.clientSecret,
          mapProfileToUser: (profile) => {
            const dto = mapGoogleProfileToDto(profile);
            const seed = dto.email ?? dto.name ?? crypto.randomUUID();
            return {
              name: dto.name ?? undefined,
              email: dto.email ?? undefined,
              image: resolveInitialAvatar(dto, seed),
            };
          },
        },
      }
    : undefined,
  trustedOrigins: config.trustedOrigins,
  user: {
    additionalFields: {
      // User preference: default currency for new stop costs.
      defaultCurrency: { type: "string", required: false, defaultValue: "JPY", input: true },
    },
  },
  plugins: [
    bearer(),
    oneTimeToken({ /* mobile OAuth bridge */ }),
    emailOTP({
      overrideDefaultEmailVerification: true,
      storeOTP: "hashed",
      sendVerificationOTP: async ({ email, otp, type }) => {
        // Dispatched via EMAIL_PROVIDER (console | resend)
      },
    }),
    // optional captcha…
  ],
  // baseURL/secret come from env (BASE_URL / BETTER_AUTH_SECRET)
});
```

### Email OTP registration

Email/password sign-up creates the user with `emailVerified=false` and does
**not** issue a session until the user verifies with a 6-digit OTP. The
`emailOTP` plugin overrides Better Auth's default verification link so
`emailVerification.sendOnSignUp` / `sendOnSignIn` send an OTP instead.

Flow:

1. `POST /api/auth/sign-up/email` — create account (captcha when enabled).
2. OTP emailed via the configured provider.
3. `POST /api/auth/email-otp/verify-email` — mark verified and auto sign-in
   (`autoSignInAfterVerification`).
4. Unverified password sign-in returns `EMAIL_NOT_VERIFIED` and triggers a
   fresh OTP (`sendOnSignIn`); the SPA shows the same OTP step.

Resend uses `POST /api/auth/email-otp/send-verification-otp` (also captcha-
protected when captcha is enabled).

### Email provider

Outbound mail is selected by env (see `infrastructure/email/`):

| `EMAIL_PROVIDER` | Behavior |
| --- | --- |
| `console` (default) | Logs the message (including OTP) to API stdout — local/dev |
| `resend` | Sends via [Resend](https://resend.com) HTTP API |

- `EMAIL_FROM` — From header (required for `resend`; defaults to
  `OpenTrip <noreply@localhost>` for console).
- `RESEND_API_KEY` — required when `EMAIL_PROVIDER=resend`.

### Social providers

Google OAuth is enabled when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
are set. The redirect URI registered in Google Cloud Console must be
`{BASE_URL}/api/auth/callback/google` (API origin — Google posts the code here).

After Better Auth finishes the callback, it redirects the browser to the
**SPA** `callbackURL` from `signIn.social`. The web client must pass the
current SPA location (`origin + pathname + search`, see `AuthForm`) so invite
pages (`/invite/:token`) resume after Google sign-in. If omitted, Better Auth
defaults to API `baseURL` and the user lands on `api.*` instead of the frontend.

Google profiles are normalized through the shared `OAuthProfileDto`
(`apps/api/src/application/user/oauth-profile.ts`) so future OAuth providers
use the same mapping path. The provider's avatar URL is written to `user.image`
during sign-up. Email sign-ups (and OAuth profiles without a picture) get a
deterministic vercel-style gradient avatar (github.com/vercel/avatar) baked into
a small static SVG data URI and stored on `user.image` (a `create.before`
database hook seeds it from the user id). The avatar is therefore static in the
database and rendered as a plain image everywhere. The generator lives in
`apps/api/src/application/user/avatar.ts` and mirrors the frontend copy in
`apps/web/src/shared/lib/avatar.ts`; the AI agent uses the same generator with
an extra dither layer (`agentAvatarUrl`).

### User preferences

`user.additionalFields.defaultCurrency` is stored on the `user` table
(`0005_currency.sql`) and surfaced on every session as `session.user.defaultCurrency`.
Users change it from Settings → Preferences (`CurrencySelect` via
`authClient.updateUser`). The planner uses it as the preselected currency when
composing a stop cost.

### Sample trip on sign-up

After Better Auth creates a user row, `databaseHooks.user.create.after` clones
the sample Japan trip (`japan-2025`) into a personal copy owned by that user
(`provisionSampleTripForUser`). The template is loaded from the live DB row when
present, otherwise from the in-memory seed snapshot. Cosmetic demo members stay
on the clone; the seed owner slot is replaced by the real user. Provisioning
errors are logged and never block registration. The shared legacy demo trip
remains listed for all signed-in users.

## Captcha

Bot protection is provided by the Better Auth Captcha plugin. It is enabled
whenever `CAPTCHA_PROVIDER` is set; the local `.env.example` ships with
Cloudflare Turnstile test keys.

```ts
// apps/api/src/infrastructure/auth/auth.ts
plugins: [
  bearer(),
  oneTimeToken({
    expiresIn: 3,
    disableClientRequest: true,
    storeToken: "hashed",
  }),
  emailOTP({ /* … */ }),
  ...(config.captcha
    ? [
        captcha({
          provider: config.captcha.provider,
          secretKey: config.captcha.secretKey,
          endpoints: [
            "/sign-up/email",
            "/sign-in/email",
            "/request-password-reset",
            "/email-otp/send-verification-otp",
          ],
        }),
      ]
    : []),
],
```

The plugin intercepts `POST` requests to the configured endpoints and verifies
the `x-captcha-response` token server-side. No custom controller or application
code is required.

### Environment

- `CAPTCHA_PROVIDER` — one of `cloudflare-turnstile`, `google-recaptcha`,
  `hcaptcha`, `captchafox`.
- `CAPTCHA_SECRET_KEY` — provider secret key (server-side only).

The public site key (`TURNSTILE_SITE_KEY`) is consumed by the Vite build and
exposed to the browser through `shared/config`; it never reaches the backend.

## Environment

- `BETTER_AUTH_SECRET` — >= 32 chars. Generate: `openssl rand -base64 32`.
- `BASE_URL` — public base URL of the API/auth server (where `/api/auth` is mounted).
- `TRUSTED_ORIGINS` — comma-separated web origins allowed to call auth (CSRF).
- `GOOGLE_CLIENT_ID` — Google OAuth client ID (optional; enables Google sign-in).
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret (optional).
- `EMAIL_PROVIDER` — `console` (default) or `resend`.
- `EMAIL_FROM` — From address for OTP mail (required for `resend`).
- `RESEND_API_KEY` — Resend API key (required for `resend`).

Never commit these. Docker uses an env file; Cloudflare uses
`wrangler secret put` / vars.

## Mounting

Hono mounts the handler before JSON body parsing:

```ts
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
```

Business routes read the session via shared middleware
(`auth.api.getSession({ headers })`) and reject unauthenticated requests with
`401`.

## Runtime differences

- **Node/Docker**: `auth.handler(c.req.raw)` works directly; the same is true on
  Workers since Hono passes a standard `Request`.
- The only runtime difference is the database connection source (see
  [database.md](database.md)); the auth config is identical.

## Schema

Auth tables (`user`, `session`, `account`, `verification`) are created by
`migrations/0001_auth.sql`. Re-run the Better Auth CLI to regenerate the schema
after changing options/plugins, then add a new migration. The `defaultCurrency`
additional field lives in `0005_currency.sql`.

`migrations/0007_google_oauth.sql` adds the unique constraint Better Auth needs
for OAuth account linking: `UNIQUE ("accountId", "providerId")` on the
`account` table.

Email OTP reuses the existing `verification` table; no extra migration is
required for the plugin itself.

## Client

The frontend uses `better-auth/react` (`apps/web/src/shared/auth`) pointing at
`/api/auth`, with `emailOTPClient` plus `inferAdditionalFields` so
`session.user.defaultCurrency` is typed. It exposes `signIn`, `signUp`,
`signOut`, `useSession`, and `authClient.emailOtp.*`.

`AuthForm` is a two-step email flow: credentials → OTP (`OTPField`). Google
OAuth is unchanged.

Avatar changes use the authenticated `/api/users/avatar` endpoints. The
application service stores or removes the object and updates Better Auth through
the server `auth.api.updateUser` API, with compensating cleanup on failure.

### Native iOS sessions

Native clients use the Better Auth Bearer and one-time-token plugins. Email
sign-in and sign-up use the standard Better Auth endpoints and persist the
returned session token. Subsequent requests send
`Authorization: Bearer <session-token>`; browser cookie sessions are unchanged.

Email sign-up on native must also complete
`POST /api/auth/email-otp/verify-email` before a session exists.

Google OAuth uses the following bridge so a long-lived session token never
appears in a callback URL. The native client must open the start URL inside
`ASWebAuthenticationSession` (not via a separate HTTP client) so Better Auth's
OAuth state cookie lands in the same jar as Google's callback:

1. The app opens `GET /api/mobile-auth/oauth/start?provider=google` in
   `ASWebAuthenticationSession`. The endpoint calls Better Auth
   `signInSocial` with `returnHeaders: true`, then **302**s to Google while
   forwarding the OAuth state `Set-Cookie` headers.
2. Better Auth completes Google OAuth and redirects the cookie-authenticated
   browser session to `/api/mobile-auth/oauth/complete`.
3. The completion endpoint creates a hashed, three-minute, single-use token and
   redirects to `opentrip://auth/callback?code=...`.
4. `POST /api/mobile-auth/oauth/exchange` consumes the code and returns the
   Better Auth session plus its token.

If Google OAuth is not configured, start redirects to
`opentrip://auth/callback?error=oauth_unavailable` so the app receives an
error through the same callback scheme.

`opentrip://` is included in the default trusted origins. Deployments that set
`TRUSTED_ORIGINS` explicitly must include it themselves.
