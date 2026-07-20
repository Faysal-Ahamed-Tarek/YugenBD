import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import AnnouncementMarquee from "@/components/home/AnnouncementMarquee";
import { AuthProvider } from "@/lib/auth";
import { getAnnouncements } from "@/lib/api";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "YugenBD — Beauty & Personal Care, Cash on Delivery in Bangladesh",
    template: "%s | YugenBD",
  },
  description:
    "Shop authentic skincare, haircare, makeup and personal care products in Bangladesh. Cash on delivery nationwide.",
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
