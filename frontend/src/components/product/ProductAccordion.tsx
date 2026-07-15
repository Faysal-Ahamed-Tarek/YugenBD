"use client";

import { useState } from "react";

export interface AccordionSection {
  title: string;
  content: string;
}

/**
 * Lightweight single-open accordion for the product detail sections.
 * Sections with no content are filtered out by the caller.
 */
export default function ProductAccordion({ sections }: { sections: AccordionSection[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (sections.length === 0) return null;

  return (
    <div className="divide-y divide-border border-y border-border">
      {sections.map((section, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={section.title}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between py-4 text-left text-base md:text-lg font-medium hover:text-primary transition-colors"
              >
                {section.title}
                <span
                  aria-hidden="true"
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-lg leading-none transition-transform duration-300 ${
                    isOpen ? "rotate-45 border-primary text-primary" : ""
                  }`}
                >
                  +
                </span>
              </button>
            </h3>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                {/* section.content is pre-sanitized HTML from the server. */}
                <div
                  className="rich-text pb-4 text-[20px] leading-relaxed text-foreground"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
