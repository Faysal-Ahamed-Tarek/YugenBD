"use client";

import { Children, useEffect, useState, type ReactNode } from "react";

/**
 * Shows `take` of its children in a random order, re-picked on every visit.
 * Pages are ISR-cached, so a server-side shuffle would show everyone the same
 * order for 5 minutes. The server (and the first client render, to keep
 * hydration consistent) uses the given order; the shuffle runs after mount.
 */
export default function Shuffle({ children, take }: { children: ReactNode; take: number }) {
  const items = Children.toArray(children);
  const [order, setOrder] = useState<number[] | null>(null);

  useEffect(() => {
    const idx = items.map((_, i) => i);
    // Fisher–Yates
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    setOrder(idx.slice(0, take));
  }, [items.length, take]);

  return <>{order ? order.map((i) => items[i]) : items.slice(0, take)}</>;
}
