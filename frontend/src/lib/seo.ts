import type { Metadata } from "next";

type OgImage = { url: string; width?: number; height?: number; alt?: string };

/**
 * The site-wide social share card. Every page falls back to this for
 * Open Graph / Twitter (Facebook, Messenger, WhatsApp, X, LinkedIn) unless it
 * overrides the images with something more specific — a product photo, a
 * concern image.
 */
export const OG_IMAGE: OgImage = {
  url: "/manual-images/YugenBdFeaturedImage.webp",
  width: 1080,
  height: 540,
  alt: "YugenBD — authentic Japanese beauty in Bangladesh",
};

/**
 * The root layout's OG block. It carries the share image and nothing else on
 * purpose: with no `og:title` / `og:description`, scrapers fall back to each
 * page's own `<title>` and meta description, so pages that never declare their
 * own OG (FAQ, contact, returns, category pages) still share with their real
 * title *and* the brand image.
 */
export const defaultSocialMeta: Pick<Metadata, "openGraph" | "twitter"> = {
  openGraph: {
    type: "website",
    siteName: "YugenBD",
    images: [OG_IMAGE],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    images: [OG_IMAGE],
  },
};

/**
 * Build the OG + Twitter pair for a page. Next.js *replaces* (never merges)
 * `openGraph` when a page declares one, so any page with its own OG block must
 * go through here rather than relying on the root layout for the image.
 */
export function socialMeta({
  title,
  description,
  url,
  images = [OG_IMAGE],
}: {
  title: string;
  description: string;
  url?: string;
  images?: OgImage[];
}): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      siteName: "YugenBD",
      title,
      description,
      url,
      images,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}
