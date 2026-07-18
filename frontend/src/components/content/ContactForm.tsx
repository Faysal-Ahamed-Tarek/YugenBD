"use client";

import { useState } from "react";

const WHATSAPP_NUMBER = "8801778931591";

const SUBJECTS = [
  "Product enquiry",
  "Order status",
  "Return or refund",
  "Product recommendation",
  "Wholesale / partnership",
  "Other",
];

/**
 * Contact form. There's no contact-message backend, so on submit it composes
 * the details into a prefilled WhatsApp chat (the same channel the storefront
 * already uses for orders) and opens it — the customer just hits send.
 */
export default function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2 || message.trim().length < 3) {
      return setError("Please enter your name and a message.");
    }
    const lines = [
      `*New enquiry from YugenBD*`,
      `Subject: ${subject}`,
      `Name: ${name.trim()}`,
      phone.trim() ? `Phone: ${phone.trim()}` : null,
      email.trim() ? `Email: ${email.trim()}` : null,
      ``,
      message.trim(),
    ].filter(Boolean);
    const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const field =
    "w-full rounded-lg border border-border bg-surface px-3.5 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary-light";
  const label = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-primary";

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-background p-6 md:p-7"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className={label}>
            Full Name
          </label>
          <input
            id="cf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="cf-phone" className={label}>
            Phone
          </label>
          <input
            id="cf-phone"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            className={field}
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="cf-email" className={label}>
          Gmail
        </label>
        <input
          id="cf-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@gmail.com"
          className={field}
        />
      </div>

      <div className="mt-4">
        <label htmlFor="cf-subject" className={label}>
          Subject
        </label>
        <select
          id="cf-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={field}
        >
          {SUBJECTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label htmlFor="cf-message" className={label}>
          Message
        </label>
        <textarea
          id="cf-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help you?"
          rows={5}
          className={`${field} resize-y`}
        />
      </div>

      {error && <p className="mt-3 text-sm text-primary">{error}</p>}

      <button
        type="submit"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
        </svg>
        Send via WhatsApp
      </button>
      <p className="mt-3 text-center text-xs text-muted">
        Opens WhatsApp with your message ready to send.
      </p>
    </form>
  );
}
