import nodemailer from "nodemailer";
import { env } from "./env";

/**
 * Transactional email via SMTP (Gmail with an App Password in production).
 * When SMTP credentials are not configured — typical local dev — the email is
 * logged to the console instead of sent, so flows stay testable end-to-end.
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

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  const subject = "Reset your YugenBD password";
  const text = [
    "We received a request to reset the password for your YugenBD account.",
    "",
    `Reset your password: ${resetLink}`,
    "",
    "This link expires in 30 minutes. If you didn't request this, you can safely ignore this email — your password stays unchanged.",
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #765341;">Reset your password</h2>
      <p>We received a request to reset the password for your YugenBD account.</p>
      <p style="margin: 24px 0;">
        <a href="${resetLink}"
           style="background: #765341; color: #ffffff; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-weight: bold;">
          Reset Password
        </a>
      </p>
      <p style="color: #6b6b6b; font-size: 13px;">
        This link expires in 30 minutes. If you didn't request this, you can safely ignore
        this email — your password stays unchanged.
      </p>
    </div>`;

  if (!transporter) {
    // Dev fallback: no SMTP creds — surface the link in the server log.
    console.log(`[mailer] SMTP not configured. Password reset link for ${to}:\n${resetLink}`);
    return;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM ?? `"YugenBD" <${env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}
