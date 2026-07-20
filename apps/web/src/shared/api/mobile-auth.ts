import { apiFetch } from "./client";

interface WebviewExchangeResult {
  session: unknown;
}

export async function exchangeMiniappWebviewCode(code: string): Promise<void> {
  await apiFetch<WebviewExchangeResult>("/api/mobile-auth/webview/exchange", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
