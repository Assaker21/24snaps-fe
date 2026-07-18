import CallToActionSection from "./components/CallToAction.section";
import FAQSection from "./components/FAQ.section";
import FooterSection from "./components/Footer.section";
import HeaderSection from "./components/Header.section";
import HowItWorksSection from "./components/HowItWorks.section";
import MainSection from "./components/Main.section";
import UseCasesSection from "./components/UseCases.section";

export default function LandingPage() {
  return (
    <div className="w-full overflow-x-hidden">
      <HeaderSection />
      <div className="h-10" />
      <MainSection />
      <div className="h-10" />
      <UseCasesSection />
      <div className="h-10" />
      <HowItWorksSection />
      <div className="h-10" />
      <CallToActionSection />
      <div className="h-10" />
      <FooterSection />
    </div>
  );
}
