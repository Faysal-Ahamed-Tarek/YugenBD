const SOCIALS = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/yugenbangladesh",
    icon: (
      <path d="M14 8h2.5V4.5h-3C10.5 4.5 9.5 6.6 9.5 8.5V11H7v3.5h2.5v6h4v-6H16l.5-3.5h-3V9c0-.6.2-1 .5-1z" />
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/bdyugen/",
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="4.5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  },
];

/** Brand social links as a horizontal icon row — used in the footer and sidebar. */
export default function SocialIcons() {
  return (
    <div className="flex gap-2">
      {SOCIALS.map((social) => (
        <a
          key={social.label}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={social.label}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground hover:text-primary hover:border-primary transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
            {social.icon}
          </svg>
        </a>
      ))}
    </div>
  );
}
