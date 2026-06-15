import { LandingNavbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Testimonials } from "@/components/landing/testimonials";
import { FAQ } from "@/components/landing/faq";
import { CtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <LandingNavbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <Testimonials />
        <FAQ />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
