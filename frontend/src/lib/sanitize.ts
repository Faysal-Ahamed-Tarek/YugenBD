import DOMPurify from "isomorphic-dompurify";

// Only the tags the admin rich-text toolbar can produce are allowed. Admin
// HTML is never rendered unsanitized.
const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a"];
const ALLOWED_ATTR = ["href", "target", "rel"];

/** Sanitize admin-authored HTML to a safe subset before rendering. */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/)/i,
  });
}

/** True when, after sanitizing, there is any visible text/content. */
export function hasContent(html: string | null | undefined): boolean {
  const clean = sanitizeHtml(html);
  return clean.replace(/<[^>]*>/g, "").trim().length > 0;
}
