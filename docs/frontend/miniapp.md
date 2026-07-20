# WeChat Mini Program PWA shell

`apps/miniapp` is a dependency-free native WeChat Mini Program shell. It owns
only WeChat login, secure browser-session handoff, and WebView failure recovery.
All product UI is the responsive PWA from `apps/web`.

## Runtime flow

1. The shell calls `wx.login()`.
2. `POST /api/auth/wechat-mini-program/sign-in` exchanges the short-lived code
   server-side and returns a normal Better Auth bearer session.
3. The shell immediately calls `POST /api/mobile-auth/webview/mint` with that
   bearer and receives a hashed, single-use, three-minute bridge code.
4. The shell opens `https://<web-origin>/miniapp#code=…`.
5. The PWA removes the fragment before making further requests, exchanges the
   code at `POST /api/mobile-auth/webview/exchange`, and receives an HttpOnly
   Better Auth cookie.
6. The PWA reloads at `/` in embedded mode. The bearer is never stored by the
   shell and never appears in a URL.

Critical application state remains on the API. `wx.miniProgram.postMessage` is
not used as a state transport because WeChat delivers it only at selected page
lifecycle events.

## Native shell

The native source is under `apps/miniapp/miniprogram`:

```text
app.js
app.json
app.wxss
pages/index/
  index.js
  index.json
  index.wxml
  index.wxss
```

The page uses the WebView renderer and custom navigation so the PWA owns the
visible mobile header. Native UI is limited to loading, error, and retry states.
There is no Taro, React, duplicated trip model, or native product page.

## Configuration

Copy `apps/miniapp/.env.example` to the gitignored `.env`:

```dotenv
MINIAPP_APP_ID=wx…
MINIAPP_API_BASE_URL=https://api.example.com
MINIAPP_WEB_BASE_URL=https://app.example.com
```

Run `make miniapp-sync-config`. It generates:

- `project.private.config.json` with the AppID;
- `miniprogram/config.js` with the public API and PWA origins.

Both files are gitignored. The AppSecret stays on the API as
`WECHAT_MINI_PROGRAM_APP_SECRET`.

Production WeChat configuration requires:

- the PWA origin in **业务域名** for `<web-view>`;
- the API origin in **request 合法域名**;
- valid HTTPS certificates;
- a normal Mini Program AppID, not a Mini Game AppID.

## Commands

```bash
make miniapp-sync-config
make miniapp-open
make miniapp-clear-cache
make miniapp
make dev-miniapp-api
```

There is no mini-program build or watcher. WeChat DevTools reads the native
source directly from `apps/miniapp/miniprogram`.

## Embedded PWA behavior

`/miniapp` is a bootstrap route handled before the regular auth gate. Embedded
mode suppresses browser-only install/update prompts, mobile onboarding, and
system-notification setup. Once the cookie handoff succeeds, the existing PWA
trips, planner, map, agent, settings, uploads, and API caching behavior are used
unchanged.

The Service Worker never caches auth, mutation, or upload requests. Bridge
responses are `Cache-Control: private, no-store`.

## Verification

Test in WeChat DevTools and real iOS/Android WeChat clients:

- first and repeat login;
- expired and reused bridge codes;
- cookie persistence and logout;
- back/deep navigation;
- avatar and trip-media uploads;
- planner, map, and agent behavior;
- offline and upstream failure recovery.
