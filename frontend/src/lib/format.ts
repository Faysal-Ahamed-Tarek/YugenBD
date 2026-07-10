/** Client-safe formatters (no server-only imports) so presentational
 *  components like ProductCard can be used in both server and client trees. */

export function formatPrice(value: string | number | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  // Never throw on a missing/invalid price — a formatter must be safe to call.
  if (num == null || Number.isNaN(num)) return "৳0";
  return `৳${num.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
}
