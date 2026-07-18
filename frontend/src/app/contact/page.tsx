import type { Metadata } from "next";
import PageHero from "@/components/content/PageHero";
import ContactForm from "@/components/content/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with YugenBD — questions about a product, an order, or your skincare routine. Call, WhatsApp, or Gmail us.",
  alternates: { canonical: "/contact" },
};

const PHONE_DISPLAY = "01778-931591";
const PHONE_TEL = "+8801778931591";
const WHATSAPP = "https://wa.me/8801778931591";
const EMAIL = "bdyugen@gmail.com";

const METHODS = [
  {
    icon: "✆",
    title: "Call / WhatsApp",
    lines: [
      { text: PHONE_DISPLAY, href: `tel:${PHONE_TEL}` },
      { text: "Chat on WhatsApp", href: WHATSAPP },
    ],
    small: "Fastest way to reach us",
  },
  {
    icon: "✉",
    title: "Gmail",
    lines: [{ text: EMAIL, href: `mailto:${EMAIL}` }],
    small: "We reply within 24 hours",
  },
];

export default function ContactPage() {
  return (
    <div>
      <PageHero
        showMark={false}
        title="Contact Us"
        subtitle={
          <>
            We&apos;d love to hear from you — whether it&apos;s a question about a product, an order, or your
            skincare routine.
            <span className="mt-2 block text-[13.5px]">
              যেকোনো পণ্য, অর্ডার বা স্কিনকেয়ার নিয়ে প্রশ্ন থাকলে আমাদের জানান — আমরা সাহায্য করতে প্রস্তুত।
            </span>
          </>
        }
      />

      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        {/* Quick methods */}
        <div className="mb-12 grid gap-4 sm:grid-cols-2">
          {METHODS.map((m) => (
            <div
              key={m.title}
              className="rounded-2xl border border-border bg-background p-6 text-center transition-all hover:-translate-y-0.5 hover:border-primary/50"
            >
              <div className="mx-auto mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-primary/40 bg-surface text-xl text-primary">
                {m.icon}
              </div>
              <h3 className="mb-1.5 text-lg font-semibold">{m.title}</h3>
              {m.lines.map((l) => (
                <a
                  key={l.text}
                  href={l.href}
                  target={l.href.startsWith("http") ? "_blank" : undefined}
                  rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="block text-sm text-muted transition-colors hover:text-primary"
                >
                  {l.text}
                </a>
              ))}
              <div className="mt-1.5 text-xs text-muted/80">{m.small}</div>
            </div>
          ))}
        </div>

        {/* Form + info */}
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold">Send us a message</h2>
            <p className="mb-6 mt-1 text-sm text-muted">
              Fill in the form and our Customer Care team will get back to you shortly.
            </p>
            <ContactForm />
          </div>

          <aside className="rounded-2xl bg-foreground p-7 text-background">
            <h3 className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-primary-light">
              Reach Us
            </h3>

            {[
              { icon: "⌂", label: "Address", val: "Dhaka, Bangladesh", sub: "Home delivery nationwide" },
              { icon: "✆", label: "Hotline", val: PHONE_DISPLAY, href: `tel:${PHONE_TEL}` },
              { icon: "✉", label: "Gmail", val: EMAIL, href: `mailto:${EMAIL}` },
            ].map((item) => (
              <div
                key={item.label}
                className="flex gap-4 border-b border-background/10 py-3.5 last:border-b-0"
              >
                <span className="w-5 flex-none text-center text-lg text-primary-light">{item.icon}</span>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-background/50">
                    {item.label}
                  </div>
                  <div className="text-[15px]">
                    {item.href ? (
                      <a href={item.href} className="transition-colors hover:text-primary-light">
                        {item.val}
                      </a>
                    ) : (
                      item.val
                    )}
                    {item.sub && <span className="block text-[13.5px] text-background/60">{item.sub}</span>}
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-5 flex gap-3">
              {[
                { label: "Facebook", href: "https://www.facebook.com/yugenbangladesh" },
                { label: "Instagram", href: "https://www.instagram.com/bdyugen/" },
                { label: "WhatsApp", href: WHATSAPP },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-lg border border-background/15 py-2.5 text-center text-xs text-primary-light transition-colors hover:border-primary-light hover:bg-background/10"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </aside>
        </div>

        {/* Support hours */}
        <div className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-2 rounded-r-lg border-l-[3px] border-primary bg-surface px-6 py-5">
          <span className="text-lg font-semibold">Support Hours</span>
          <span className="text-sm text-muted">
            <strong className="text-foreground">Sat – Thu:</strong> 10:00 AM – 8:00 PM
          </span>
          <span className="text-sm text-muted">
            <strong className="text-foreground">Friday:</strong> 3:00 PM – 8:00 PM
          </span>
          <span className="text-sm text-muted">শনি–বৃহঃ সকাল ১০টা – রাত ৮টা</span>
        </div>
      </div>
    </div>
  );
}
