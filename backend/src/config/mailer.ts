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
      // Fail fast instead of hanging ~2 min when the VPS blocks outbound SMTP.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
    })
  : null;

// On boot, say plainly whether email is configured and (if so) whether the
// SMTP login/connection actually works — so `pm2 logs` reveals the problem
// without waiting for a registration to fail.
if (!transporter) {
  console.warn(
    "[mailer] SMTP is NOT configured (SMTP_USER / SMTP_PASS missing from env). " +
      "Emails will be logged to the console instead of sent."
  );
} else {
  transporter.verify().then(
    () => console.log(`[mailer] SMTP ready — authenticated as ${env.SMTP_USER}`),
    (err) =>
      console.error(
        `[mailer] SMTP verify FAILED for ${env.SMTP_USER}: ${err?.message ?? err}. ` +
          "Common causes: VPS blocks outbound port " +
          env.SMTP_PORT +
          ", wrong Gmail App Password, or 2FA not enabled."
      )
  );
}

const from = () => env.SMTP_FROM ?? `"YugenBD" <${env.SMTP_USER}>`;

/** Send + log the real outcome. Never lets a send failure crash the caller. */
async function send(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  link: string;
  kind: string;
}): Promise<void> {
  if (!transporter) {
    console.log(`[mailer] SMTP not configured. ${opts.kind} link for ${opts.to}:\n${opts.link}`);
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: from(),
      to: opts.to,
      replyTo: env.SMTP_USER,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    console.log(`[mailer] Sent ${opts.kind} to ${opts.to} (id ${info.messageId})`);
  } catch (err) {
    // Log the real reason but DON'T rethrow — a mail outage shouldn't 500 the
    // registration/forgot-password request. The user can use "resend".
    console.error(
      `[mailer] FAILED to send ${opts.kind} to ${opts.to}: ${(err as Error)?.message ?? err}`
    );
  }
}

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

  await send({ to, subject, text, html, link: verifyLink, kind: "verification" });
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

  await send({ to, subject, text, html, link: resetLink, kind: "password reset" });
}
