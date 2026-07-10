import type { EmailMessage } from "./types";

export type OtpEmailType =
  | "sign-in"
  | "email-verification"
  | "forget-password"
  | "change-email";

const SUBJECTS: Record<OtpEmailType, string> = {
  "sign-in": "Your OpenTrip sign-in code",
  "email-verification": "Verify your OpenTrip email",
  "forget-password": "Reset your OpenTrip password",
  "change-email": "Confirm your new OpenTrip email",
};

/** Build a plain-text OTP email. Keep copy short; the code is the payload. */
export function buildOtpEmail(input: {
  to: string;
  otp: string;
  type: OtpEmailType;
  expiresInSeconds: number;
}): EmailMessage {
  const minutes = Math.max(1, Math.round(input.expiresInSeconds / 60));
  const subject = SUBJECTS[input.type];
  const text = [
    `Your verification code is ${input.otp}.`,
    `It expires in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  return {
    to: input.to,
    subject,
    text,
  };
}
