import CTASection from "@/components/landing/CTASection";
import HeroSection from "@/components/landing/HeroSection";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingNav from "@/components/landing/LandingNav";
import OneDoneSection from "@/components/landing/OneDoneSection";
import PricingSection from "@/components/landing/PricingSection";
import SOONAISection from "@/components/landing/SOONAISection";
import ValuePropsSection from "@/components/landing/ValuePropsSection";

export default function LandingPage() {
  return (
    <main className="overflow-x-hidden bg-[#fafafa]">
      <LandingNav />
      <HeroSection />
      <OneDoneSection />
      <SOONAISection />
      <ValuePropsSection />
      <PricingSection />
      <CTASection />
      <LandingFooter />
    </main>
  );
}
