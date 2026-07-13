"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Category } from "@/types";
import SearchBar from "./SearchBar";
import SocialIcons from "@/components/ui/SocialIcons";

type FetchStatus = "idle" | "loading" | "error";

/**
 * Full-screen mobile menu panel on a white background, slid in from the
 * right with a pure CSS transform. Always closed on mount — it only opens
 * via the hamburger button, and `inert` keeps it out of the tab order and
 * hit-testing while closed.
 *
 * Content order: search bar → categories → social icons.
 *
 * Categories normally arrive as props from the server-rendered Header
 * (existing data-fetching pattern, zero client fetch). If that list is
 * empty — e.g. the API was unreachable when the page was rendered — the
 * panel retries from the browser on first open, with loading and
 * fallback states.
 */
export default function MobileSidebar({ categories: initialCategories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [status, setStatus] = useState<FetchStatus>("idle");
  // Which top-level categories have their subcategory sub-list expanded.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  // Portal target exists only in the browser; render the panel after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Client-side retry when the server-provided list came back empty.
  useEffect(() => {
    if (!open || categories.length > 0 || status !== "idle") return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    fetch(`${apiUrl}/categories`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json: { data?: Category[] }) => {
        if (cancelled) return;
        setCategories(json.data ?? []);
        setStatus((json.data ?? []).length > 0 ? "idle" : "error");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [open, categories.length, status]);

  // Lock body scroll while the panel is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="p-2 rounded-full text-foreground hover:text-primary hover:bg-primary-light transition-colors"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16" />
          <path d="M4 12h11" />
          <path d="M4 17h16" />
        </svg>
      </button>

      {/* Full-screen panel — portaled to <body> because the sticky header's
          backdrop-blur creates a containing block that would trap `fixed`
          descendants at header height instead of covering the viewport.
          Closed (off-canvas + inert) by default. */}
      {mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            aria-hidden={!open}
            inert={!open}
            className={`md:hidden fixed inset-0 z-50 bg-white flex flex-col transition-transform duration-300 ease-out ${
              open ? "translate-x-0" : "translate-x-full"
            }`}
          >
        {/* Top bar: logo + close */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Image
            src="/manual-images/logo.svg"
            alt="YugenBD"
            width={132}
            height={32}
            className="h-7 w-auto"
          />
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="p-2 rounded-full hover:bg-surface transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* 1. Search */}
        <div className="p-4 border-b border-border">
          <SearchBar />
        </div>

        {/* 2. Categories — scrolls independently if the list is long */}
        <nav aria-label="Categories" className="flex-1 overflow-y-auto p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
            Categories
          </p>
          {status === "loading" ? (
            <ul className="space-y-2" aria-label="Loading categories">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="h-10 rounded-lg bg-surface animate-pulse" />
              ))}
            </ul>
          ) : categories.length === 0 ? (
            <p className="py-2 px-3 text-sm text-muted">
              Categories are unavailable right now. Please try again later.
            </p>
          ) : (
            <ul className="space-y-1">
              {categories.map((cat) => {
                const children = cat.children ?? [];
                const isExpanded = expanded.has(cat.id);
                return (
                  <li key={cat.id}>
                    <div className="flex items-center">
                      <Link
                        href={`/category/${cat.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex-1 py-2.5 px-3 rounded-lg text-[15px] font-medium hover:bg-primary-light hover:text-primary transition-colors"
                      >
                        {cat.name}
                      </Link>
                      {children.length > 0 ? (
                        <button
                          type="button"
                          aria-label={isExpanded ? `Collapse ${cat.name}` : `Expand ${cat.name}`}
                          aria-expanded={isExpanded}
                          onClick={() => toggleExpand(cat.id)}
                          className="p-2.5 rounded-lg text-muted hover:bg-surface hover:text-primary transition-colors"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                      ) : (
                        <span className="p-2.5 text-muted" aria-hidden>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </span>
                      )}
                    </div>
                    {children.length > 0 && isExpanded && (
                      <ul className="mt-0.5 mb-1 ml-4 border-l border-border pl-2 space-y-0.5">
                        {children.map((child) => (
                          <li key={child.id}>
                            <Link
                              href={`/category/${child.slug}`}
                              onClick={() => setOpen(false)}
                              className="block py-2 px-3 rounded-lg text-sm text-foreground hover:bg-primary-light hover:text-primary transition-colors"
                            >
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

            {/* 3. Social icons */}
            <div className="p-4 border-t border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                Follow Us
              </p>
              <SocialIcons />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
