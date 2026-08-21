import CallToActionSection from "./components/CallToAction.section";
import FooterSection from "./components/Footer.section";
import HeaderSection from "./components/Header.section";
import HowItWorksSection from "./components/HowItWorks.section";
import MainSection from "./components/Main.section";
import UseCasesSection from "./components/UseCases.section";

export default function LandingPage() {
  return (
    <div className="w-full overflow-x-hidden bg-background">
      <HeaderSection />
      <MainSection />
      <UseCasesSection />
      <HowItWorksSection />
      <CallToActionSection />
      <FooterSection />
    </div>
  );
}
