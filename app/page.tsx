import UrgencyBar from "@/components/UrgencyBar";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import PlateDesigner from "@/components/PlateDesigner";
import Pricing from "@/components/Pricing";
import OrderForm from "@/components/OrderForm";
import PaymentSection from "@/components/PaymentSection";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { StorefrontProvider } from "@/components/StorefrontContext";

export default function Home() {
  return (
    <StorefrontProvider>
      <main className="min-h-screen flex flex-col bg-carbon-900 text-silver-200">
        {/* 1. Urgency Banner */}
        <UrgencyBar
          urgencyText="BRTA deadline: November 15 — order your compliant plate today"
          hotline="01632333221"
        />

        {/* 2. Sticky Navbar */}
        <Navbar hotline="01632333221" />

        {/* 3. Hero Section */}
        <Hero />

        {/* 4. Centerpiece: Plate Designer */}
        <PlateDesigner />

        {/* 5. Pricing & Wholesale Matrix */}
        <Pricing />

        {/* 6. Order Intake Form */}
        <OrderForm />

        {/* 7. Payment Options */}
        <PaymentSection />

        {/* 8. FAQ Section */}
        <FAQ />

        {/* 9. Comprehensive Footer */}
        <Footer />

        {/* 10. Persistent WhatsApp Floating Trigger */}
        <WhatsAppFloat />
      </main>
    </StorefrontProvider>
  );
}
