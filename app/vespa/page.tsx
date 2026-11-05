import type { Metadata } from "next";
import VespaExperience from "@/components/VespaExperience";
export const metadata: Metadata = {
  title: "Vintage plate atelier | Decorative nameplate collection",
  openGraph: { title: "Vintage plate atelier | Decorative nameplates", description: "Four decorative finish concepts. Working name, sample catalog, no live payments.", siteName: "Vintage plate atelier · Working name", locale: "en_US" },
  twitter: { card: "summary_large_image", title: "Vintage plate atelier | Decorative nameplates", description: "A distinct Lorapok Labs sample nameplate shop." },
  description: "A Lorapok Labs decorative nameplate shop preview. Four vintage-inspired finish concepts, personal lettering and an unpaid sample request flow. Working name; specifications and fit unverified.",
};
export default function VespaPage() { return <VespaExperience />; }
