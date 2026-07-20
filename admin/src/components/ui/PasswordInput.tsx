"use client";

import { useState } from "react";

/**
 * Password field with a show/hide eye toggle.
 *
 * Drop-in replacement for `<input type="password" …>` — it forwards every prop
 * (id, value, onChange, autoComplete, className) so each page keeps its own
 * field styling. Right padding is applied inline rather than as a Tailwind
 * class because the caller's className already sets `px-*`, and which of two
 * competing utilities wins depends on stylesheet order, not attribute order.
 *
 * The toggle is `tabIndex={-1}` so tabbing runs password → submit, and it
 * never submits the surrounding form (`type="button"`).
 */
export default function PasswordInput({
  className = "",
  style,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={className}
        style={{ paddingRight: "2.75rem", ...style }}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-primary transition-colors"
      >
        {visible ? (
          /* eye-off */
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.4 5.2A9.7 9.7 0 0 1 12 5c5 0 9 4.5 9 7a11 11 0 0 1-2.4 3.5M6.2 6.7C4 8.1 3 10.3 3 12c0 2.5 4 7 9 7a9.6 9.6 0 0 0 4-.9" />
          </svg>
        ) : (
          /* eye */
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12c0-2.5 4-7 9-7s9 4.5 9 7-4 7-9 7-9-4.5-9-7z" />
            <circle cx="12" cy="12" r="2.6" />
          </svg>
        )}
      </button>
    </div>
  );
}
