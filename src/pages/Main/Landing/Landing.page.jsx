import CallToActionSection from "./components/CallToAction.section";
import FooterSection from "./components/Footer.section";
import HeaderSection from "./components/Header.section";
import HowItWorksSection from "./components/HowItWorks.section";
import MainSection from "./components/Main.section";
import UseCasesSection from "./components/UseCases.section";
import useSeo from "../../../hooks/useSeo.hook";

export default function LandingPage() {
  // The one screen that belongs in search results — everywhere else is private.
  useSeo({ index: true, path: "/" });

  return (
    <div className="w-full overflow-x-hidden bg-background">
      <HeaderSection />

      {/* Everything between the bar and the footer is the page itself — a landmark
          a screen reader can jump to, and the block a crawler reads as the content. */}
      <main>
        <MainSection />
        <UseCasesSection />
        <HowItWorksSection />
        <CallToActionSection />
      </main>

      <FooterSection />
    </div>
  );
}
