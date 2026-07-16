import nodemailer from "nodemailer";
import { env } from "./env";

/**
 * Transactional email via SMTP (Gmail with an App Password in production).
 * When SMTP credentials are not configured — typical local dev — the email is
 * logged to the console instead of sent, so flows stay testable end-to-end.
 *
 * Deliverability notes (why these emails are written the way they are):
 * - From MUST be the authenticated Gmail account (alignment → SPF/DKIM pass).
 * - The raw URL is shown under the button — hidden-destination buttons are a
 *   phishing heuristic.
 * - A personal greeting + plain transactional wording scores better than
 *   marketing copy. Keep it boring.
 */
const smtpConfigured = Boolean(env.SMTP_USER && env.SMTP_PASS);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null;

const from = () => env.SMTP_FROM ?? `"YugenBD" <${env.SMTP_USER}>`;

/** Shared transactional layout: greeting, body, button + visible URL, footer. */
function layout(opts: {
  greetingName: string | null;
  intro: string;
  buttonLabel: string;
  link: string;
  footer: string;
}) {
  const greeting = opts.greetingName ? `Hi ${opts.greetingName},` : "Hi,";
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #171717;">
      <p>${greeting}</p>
      <p>${opts.intro}</p>
      <p style="margin: 24px 0;">
        <a href="${opts.link}"
           style="background: #765341; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          ${opts.buttonLabel}
        </a>
      </p>
      <p style="color: #6b6b6b; font-size: 13px;">
        If the button doesn't work, copy this link into your browser:<br />
        <a href="${opts.link}" style="color: #765341; word-break: break-all;">${opts.link}</a>
      </p>
      <p style="color: #6b6b6b; font-size: 13px;">${opts.footer}</p>
      <p style="color: #6b6b6b; font-size: 13px;">— YugenBD, Dhaka, Bangladesh</p>
    </div>`;
}

export async function sendVerificationEmail(
  to: string,
  verifyLink: string,
  recipientName: string | null = null
): Promise<void> {
  const subject = "Verify your email address for YugenBD";
  const text = [
    recipientName ? `Hi ${recipientName},` : "Hi,",
    "",
    "You created an account at YugenBD with this email address. Please confirm it to activate your account:",
    "",
    verifyLink,
    "",
    "This link expires in 24 hours. You can't log in until your email is verified.",
    "If you didn't create this account, you can ignore this email.",
    "",
    "— YugenBD, Dhaka, Bangladesh",
  ].join("\n");
  const html = layout({
    greetingName: recipientName,
    intro:
      "You created an account at YugenBD with this email address. Please confirm it to activate your account.",
    buttonLabel: "Verify Email Address",
    link: verifyLink,
    footer:
      "This link expires in 24 hours. You can't log in until your email is verified. If you didn't create this account, you can ignore this email.",
  });

  if (!transporter) {
    console.log(`[mailer] SMTP not configured. Verification link for ${to}:\n${verifyLink}`);
    return;
  }

  await transporter.sendMail({ from: from(), to, replyTo: env.SMTP_USER, subject, text, html });
}

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  recipientName: string | null = null
): Promise<void> {
  const subject = "Reset your YugenBD password";
  const text = [
    recipientName ? `Hi ${recipientName},` : "Hi,",
    "",
    "We received a request to reset the password for your YugenBD account:",
    "",
    resetLink,
    "",
    "This link expires in 30 minutes. If you didn't request this, you can safely ignore this email — your password stays unchanged.",
    "",
    "— YugenBD, Dhaka, Bangladesh",
  ].join("\n");
  const html = layout({
    greetingName: recipientName,
    intro: "We received a request to reset the password for your YugenBD account.",
    buttonLabel: "Reset Password",
    link: resetLink,
    footer:
      "This link expires in 30 minutes. If you didn't request this, you can safely ignore this email — your password stays unchanged.",
  });

  if (!transporter) {
    // Dev fallback: no SMTP creds — surface the link in the server log.
    console.log(`[mailer] SMTP not configured. Password reset link for ${to}:\n${resetLink}`);
    return;
  }

  await transporter.sendMail({ from: from(), to, replyTo: env.SMTP_USER, subject, text, html });
}
