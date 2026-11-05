import type { Metadata } from "next";
import BNPStorefront from "@/components/BNPStorefront";
export const metadata: Metadata = { title: "BNP | Your ride. Your identity.", description: "Explore BNP motorcycle and scooter front-plate designs. Preview your details and prepare an unpaid sample request. Online payment is not available.", openGraph: { title: "BNP | Your ride. Your identity.", description: "The dedicated BNP storefront and plate studio.", siteName: "BNP — Bike Number Plate", locale: "bn_BD" }, twitter: { card: "summary_large_image", title: "BNP | Your ride. Your identity.", description: "The dedicated BNP storefront and plate studio. Online payment is not enabled." } };
export default function BNPPage() { return <BNPStorefront />; }
