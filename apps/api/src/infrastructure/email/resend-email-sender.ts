import type { EmailMessage, EmailSender } from "./types";

const RESEND_API_URL = "https://api.resend.com/emails";

export interface ResendEmailSenderOptions {
  apiKey: string;
  from: string;
}

/** HTTP sender for Resend (Workers-friendly; no SMTP socket). */
export function createResendEmailSender(
  options: ResendEmailSenderOptions,
): EmailSender {
  const { apiKey, from } = options;
  return {
    async send(message: EmailMessage): Promise<void> {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `Resend send failed (${response.status}): ${body || response.statusText}`,
        );
      }
    },
  };
}
