import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/content/PageHero";
import { getFaqs } from "@/lib/api";
import type { FaqItem, FaqSegment } from "@/types";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Everything you need to know about ordering, authenticity, delivery, returns and care at YugenBD — authentic Japanese beauty in Bangladesh.",
  alternates: { canonical: "/faq" },
};

const WHATSAPP = "https://wa.me/8801778931591";

// The four fixed segments and their display order / titles.
const SEGMENTS: { key: FaqSegment; num: string; title: string }[] = [
  { key: "products", num: "01", title: "Products & Authenticity" },
  { key: "orders", num: "02", title: "Orders & Payment" },
  { key: "delivery", num: "03", title: "Delivery" },
  { key: "returns", num: "04", title: "Returns & Care" },
];

/** Render a plain-text answer: blank lines split paragraphs, single newlines
 *  are preserved within a paragraph. */
function Answer({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </>
  );
}

export default async function FaqPage() {
  const items = await getFaqs();

  // Group active items by segment, keeping only segments that have questions.
  const groups = SEGMENTS.map((seg) => ({
    ...seg,
    items: items.filter((i: FaqItem) => i.segment === seg.key),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <PageHero
        showMark={false}
        title="Frequently Asked Questions"
        subtitle="Everything you need to know about ordering, authenticity, delivery, and care — your reliable partner for authentic Japanese beauty."
      />

      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        {groups.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-muted">
            Our Help Centre is being updated. Please check back soon or reach out to us directly.
          </p>
        ) : (
          <>
            {/* Category quick-nav */}
            <nav className="mb-10 flex flex-wrap justify-center gap-2.5">
              {groups.map((g) => (
                <a
                  key={g.key}
                  href={`#${g.key}`}
                  className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:border-primary hover:text-primary"
                >
                  {g.title}
                </a>
              ))}
            </nav>

            {groups.map((group) => (
              <section key={group.key} className="mb-10 scroll-mt-24" id={group.key}>
                <h2 className="mb-4 flex items-baseline gap-3 border-b-2 border-primary/40 pb-2 text-xl md:text-2xl font-semibold">
                  <span className="text-sm italic text-primary">{group.num}</span>
                  {group.title}
                </h2>

                <div className="space-y-3">
                  {group.items.map((item) => (
                    <details
                      key={item.id}
                      className="group rounded-xl border border-border bg-background transition-colors open:border-primary/40"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[17px] font-medium transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
                        {item.question}
                        <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full border border-primary/50 text-lg leading-none text-primary transition-transform duration-300 group-open:rotate-45">
                          +
                        </span>
                      </summary>
                      <div className="rich-faq space-y-2 px-5 pb-5 text-[15px] leading-relaxed text-muted">
                        <Answer text={item.answer} />
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        {/* Contact CTA */}
        <div className="mt-14 rounded-2xl bg-foreground px-6 py-11 text-center text-background">
          <div className="text-xl tracking-[0.2em] text-primary-light">幽玄</div>
          <h2 className="mt-2 text-2xl md:text-3xl font-semibold">Didn&apos;t find your answer?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-background/70">
            Our Customer Care team is always happy to help. Reach out and we&apos;ll get back to you.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              Chat on WhatsApp
            </a>
            <Link
              href="/contact"
              className="rounded-full border border-background/30 px-7 py-3 text-sm font-semibold text-background transition-colors hover:bg-background/10"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
