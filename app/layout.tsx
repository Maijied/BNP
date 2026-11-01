import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Sora } from "next/font/google";
import "./globals.css";

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

export const viewport: Viewport = {
  themeColor: "#0B0B0C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://bnp.lorapok.tech"),
  title: "BNP: Bike Number Plate — Mirror Silver Steel Plates | Lorapok Labs & LoraHost",
  description:
    "Order luxury laser-cut 0.8 mm Finish No. 8 mirror-silver stainless steel and BRTA-compliant aluminum motorcycle and scooter plates in Bangladesh. A Joy & Arash Enterprise Venture in strategic partnership with Lorapok Labs and LoraHost. Live at bnp.lorapok.tech.",
  keywords: [
    "Bike Number Plate",
    "BNP",
    "Motorcycle Number Plate Bangladesh",
    "Scooter Number Plate",
    "Mirror Silver Steel Plate",
    "BRTA Compliant Number Plate",
    "Joy & Arash Enterprise",
    "Lorapok Labs",
    "LoraHost",
    "bnp.lorapok.tech",
  ],
  authors: [{ name: "Joy & Arash Enterprise" }, { name: "Lorapok Labs" }, { name: "LoraHost" }],
  creator: "Lorapok Labs & Joy & Arash Enterprise",
  publisher: "Lorapok Labs",
  openGraph: {
    title: "BNP: Bike Number Plate — Mirror Silver Steel Plates | Lorapok Labs & LoraHost",
    description:
      "Laser-cut 0.8 mm Finish No. 8 mirror silver steel plates. Built to outlast your ride. BRTA compliance deadline Nov 15. Powered exclusively by LoraHost Payment Gateway.",
    url: "https://bnp.lorapok.tech",
    siteName: "BNP: Bike Number Plate",
    locale: "bn_BD",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BNP — Bike Number Plate",
    description: "Premium Quality | Durable | Stylish. A Joy & Arash Enterprise Venture in Strategic Partnership with Lorapok Labs & LoraHost.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className={`${hindSiliguri.variable} ${sora.variable}`}>
      <body className="min-h-screen bg-carbon-900 text-silver-200 antialiased font-sans selection:bg-bnp selection:text-white">
        {children}
      </body>
    </html>
  );
}
