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
  /** Present on link-driven mails (verify / reset) — logged when SMTP is off. */
  link?: string;
  kind: string;
}): Promise<void> {
  if (!transporter) {
    console.log(
      `[mailer] SMTP not configured. ${opts.kind} for ${opts.to}:\n${opts.link ?? opts.text}`
    );
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

/* ───────────────────────── Order notification ───────────────────────── */

/** Just the order fields the notification needs — kept local so the mailer
 *  doesn't depend on the orders module (which imports the mailer). */
export interface OrderNotification {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  deliveryZone: "inside_dhaka" | "outside_dhaka";
  deliveryFee: string;
  subtotal: string;
  total: string;
  paymentMethod: "cod" | "bkash";
  bkashTransactionId: string | null;
  bkashAmount: string | null;
  items: { title: string; price: string; quantity: number; isPreOrder: boolean }[];
}

const taka = (value: string) => `৳${Math.round(Number(value)).toLocaleString("en-US")}`;

/**
 * Notify the shop inbox (ORDER_NOTIFICATION_EMAIL) that an order came in.
 * Fire-and-forget: `send` already swallows failures, so a mail outage can
 * never block or fail the customer's checkout.
 */
export async function sendNewOrderEmail(order: OrderNotification): Promise<void> {
  const to = env.ORDER_NOTIFICATION_EMAIL;
  const shortId = order.id.slice(0, 8);
  const zone = order.deliveryZone === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka";
  const payment =
    order.paymentMethod === "bkash"
      ? `bKash — txn ${order.bkashTransactionId ?? "—"} (${order.bkashAmount ? taka(order.bkashAmount) : "—"}) · NEEDS VERIFICATION`
      : "Cash on Delivery";

  const subject = `New order #${shortId} — ${taka(order.total)} · ${order.fullName}`;

  const lines = order.items.map(
    (i) => `- ${i.title}${i.isPreOrder ? " [PRE-ORDER]" : ""} × ${i.quantity} — ${taka(String(Number(i.price) * i.quantity))}`
  );
  const text = [
    `New order #${shortId}`,
    "",
    `Customer: ${order.fullName}`,
    `Phone:    ${order.phone}`,
    `Address:  ${order.address}`,
    `Delivery: ${zone} (${taka(order.deliveryFee)})`,
    `Payment:  ${payment}`,
    "",
    "Items:",
    ...lines,
    "",
    `Subtotal: ${taka(order.subtotal)}`,
    `Delivery: ${Number(order.deliveryFee) === 0 ? "Free" : taka(order.deliveryFee)}`,
    `Total:    ${taka(order.total)}`,
  ].join("\n");

  const rows = order.items
    .map(
      (i) => `
        <tr>
          <td style="padding:6px 0; border-bottom:1px solid #e7e7ea;">
            ${i.title}${i.isPreOrder ? ' <span style="color:#b45309; font-size:12px;">(pre-order)</span>' : ""}
          </td>
          <td style="padding:6px 0; border-bottom:1px solid #e7e7ea; text-align:center;">×${i.quantity}</td>
          <td style="padding:6px 0; border-bottom:1px solid #e7e7ea; text-align:right;">${taka(
            String(Number(i.price) * i.quantity)
          )}</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #171717;">
      <h2 style="margin:0 0 4px;">New order #${shortId}</h2>
      <p style="margin:0 0 20px; color:#6b6b6b; font-size:13px;">${payment}</p>

      <table style="width:100%; font-size:14px; border-collapse:collapse;">
        <tr><td style="color:#6b6b6b; width:90px;">Customer</td><td><strong>${order.fullName}</strong></td></tr>
        <tr><td style="color:#6b6b6b;">Phone</td><td>${order.phone}</td></tr>
        <tr><td style="color:#6b6b6b; vertical-align:top;">Address</td><td>${order.address}</td></tr>
        <tr><td style="color:#6b6b6b;">Delivery</td><td>${zone}</td></tr>
      </table>

      <table style="width:100%; font-size:14px; border-collapse:collapse; margin-top:20px;">
        ${rows}
        <tr><td style="padding-top:10px; color:#6b6b6b;">Subtotal</td><td></td><td style="padding-top:10px; text-align:right;">${taka(order.subtotal)}</td></tr>
        <tr><td style="color:#6b6b6b;">Delivery</td><td></td><td style="text-align:right;">${
          Number(order.deliveryFee) === 0 ? "Free" : taka(order.deliveryFee)
        }</td></tr>
        <tr><td style="font-weight:bold; padding-top:6px;">Total</td><td></td><td style="font-weight:bold; text-align:right; padding-top:6px; color:#765341;">${taka(
          order.total
        )}</td></tr>
      </table>

      <p style="color:#6b6b6b; font-size:13px; margin-top:24px;">— YugenBD order notification</p>
    </div>`;

  await send({ to, subject, text, html, kind: `order #${shortId} notification` });
}
