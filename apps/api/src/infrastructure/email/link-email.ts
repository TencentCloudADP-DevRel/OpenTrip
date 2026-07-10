import type { EmailMessage } from "./types";

export type LinkEmailType = "reset-password" | "change-email-confirmation";

const SUBJECTS: Record<LinkEmailType, string> = {
  "reset-password": "Reset your OpenTrip password",
  "change-email-confirmation": "Confirm your OpenTrip email change",
};

/** Build a plain-text email that carries an action URL (reset / confirm). */
export function buildLinkEmail(input: {
  to: string;
  type: LinkEmailType;
  url: string;
  /** Optional context line, e.g. the proposed new email. */
  detail?: string;
}): EmailMessage {
  const subject = SUBJECTS[input.type];
  const intro =
    input.type === "reset-password"
      ? "Use the link below to set a new password for your OpenTrip account."
      : "Confirm that you want to change the email on your OpenTrip account.";

  const text = [
    intro,
    ...(input.detail ? [input.detail, ""] : [""]),
    input.url,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  return {
    to: input.to,
    subject,
    text,
  };
}
