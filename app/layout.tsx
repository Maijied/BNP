import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Sora } from "next/font/google";
import { configuredSiteOrigin } from "@/lib/site-origin.mjs";
import "./globals.css";
import "./experiences.css";
import "./bnp.css";
import "./vintage.css";

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind-siliguri",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

const siteOrigin = configuredSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);

export const viewport: Viewport = {
  themeColor: "#0B0B0C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: siteOrigin,
  robots: { index: false, follow: false },
  title: "Vintage plate atelier | Decorative nameplates",
  description: "Explore vintage-inspired decorative nameplates from Lorapok Labs. Preview personal lettering and sample requests. Working name; no live payments.",
  authors: [{ name: "Lorapok Labs" }],
  creator: "Lorapok Labs",
  publisher: "Lorapok Labs",
  openGraph: {
    title: "Vintage plate atelier | Decorative nameplates",
    description: "Vintage-inspired decorative nameplate concepts and personal lettering. A distinct Lorapok Labs shop preview.",
    url: siteOrigin?.href,
    siteName: "Vintage plate atelier · Working name",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vintage plate atelier | Decorative nameplates",
    description: "An independent Lorapok Labs project. Local preview, no live transactions.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${hindSiliguri.variable} ${sora.variable}`}>
      <body className="min-h-screen bg-carbon-900 text-silver-200 antialiased font-sans selection:bg-bnp selection:text-white">
        {children}
      </body>
    </html>
  );
}

