/**
 * Centered page hero for content pages (FAQ, Returns, Contact). Uses the site
 * theme tokens — the kanji mark + eyebrow + serifless title match the brand
 * without the standalone HTML pages' own fonts/colours.
 */
export default function PageHero({
  eyebrow,
  title,
  subtitle,
  showMark = true,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  showMark?: boolean;
}) {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16 text-center">
        {showMark && (
          <div className="text-3xl md:text-4xl font-semibold tracking-[0.18em] text-foreground">
            幽玄
          </div>
        )}
        {eyebrow && (
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-3xl md:text-5xl font-semibold leading-tight">{title}</h1>
        {subtitle && (
          <p className="mx-auto mt-3 max-w-xl text-sm md:text-base text-muted leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
