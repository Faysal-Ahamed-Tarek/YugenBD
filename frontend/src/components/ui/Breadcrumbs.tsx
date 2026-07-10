import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

/** Accessible breadcrumb trail; the last crumb is the current page. */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs uppercase tracking-wide text-muted">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-primary transition-colors shrink-0">
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={`truncate ${isLast ? "text-primary font-medium" : ""}`}
                >
                  {item.label}
                </span>
              )}
              {!isLast && <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
