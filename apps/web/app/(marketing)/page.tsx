import { HeroSection } from "@/components/features/marketing/hero-section";
import { FeaturesGrid } from "@/components/features/marketing/features-grid";
import { SocialProof } from "@/components/features/marketing/social-proof";
import { PricingSection } from "@/components/features/marketing/pricing-section";
import { FAQSection } from "@/components/features/marketing/faq-section";
import { CTASection } from "@/components/features/marketing/cta-section";
import { MarketingNav } from "@/components/layout/marketing-nav";
import { MarketingFooter } from "@/components/layout/marketing-footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <main>
        <HeroSection />
        <SocialProof />
        <FeaturesGrid />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <MarketingFooter />
    </div>
  );
}
