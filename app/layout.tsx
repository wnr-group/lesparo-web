import type { Metadata, Viewport } from "next";
import { Archivo, Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Bricolage Grotesque is the bold contemporary display voice; Plus Jakarta Sans is the body/UI face;
// Archivo (italic, with its width axis) is the athletic voice for prices, badges and shopping headlines.
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-heading", display: "swap" });
const sport = Archivo({ subsets: ["latin"], style: ["normal", "italic"], axes: ["wdth"], variable: "--font-promo", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "LESPARO | Abija Exports, Erode", template: "%s | LESPARO" },
  description:
    "LESPARO by Abija Exports, Erode: gents and kids shorts, tracks and 3/4ths, lungis, kavi dhothies, towels and kerchiefs. Wholesale enquiries welcome.",
  openGraph: { siteName: "LESPARO | Abija Exports", type: "website", locale: "en_IN" },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${sans.variable} ${display.variable} ${sport.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
