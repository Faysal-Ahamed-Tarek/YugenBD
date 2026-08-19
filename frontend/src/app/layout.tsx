import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import AnnouncementMarquee from "@/components/home/AnnouncementMarquee";
import { AuthProvider } from "@/lib/auth";
import { getAnnouncements } from "@/lib/api";
import { defaultSocialMeta } from "@/lib/seo";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  display: "swap",
});

const DEFAULT_TITLE = "YugenBD | Authentic Japanese Skincare Products in BD";
const DEFAULT_DESCRIPTION =
  "Browse authentic Japanese sunscreens, moisturisers, hair masks, oil cleansers, Face Wash at YugenBD";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | YugenBD",
  },
  description: DEFAULT_DESCRIPTION,
  // Inherited by every page that does not declare its own `openGraph`, so a
  // link shared to Messenger / WhatsApp / Facebook always carries the brand
  // card. Pages with a better image (products, concerns) override it.
  ...defaultSocialMeta,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Announcement bar sits at the very top of every page, above (and separate
  // from) the sticky header, and scrolls away with the page.
  const announcements = await getAnnouncements();

  return (
    <html lang="en" className={`${jost.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <AnnouncementMarquee items={announcements} />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer announcements={announcements} />
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
