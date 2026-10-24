import SectionLabel from "../../../../components/SectionLabel.component";
import { useT } from "../../../../contexts/I18n.context";

// The three steps. Only the key and the image live here — the words are in the
// catalogue like everything else.
const STEPS = [
  { key: "create", image: "uncached-what-should-we-call-this-event.png" },
  { key: "invite", image: "uncached-share-with-qr.png" },
  { key: "capture", image: "uncached-camera-1.png" },
];

export default function HowItWorksSection() {
  const t = useT();

  return (
    <div className="px-4 pt-14">
      <SectionLabel>{t("landing.how.label")}</SectionLabel>

      <h2 className="font-serif text-3xl mt-4 mb-6 whitespace-pre-line">
        {t("landing.how.title")}
      </h2>

      <div className="flex flex-col md:flex-row gap-3">
        {STEPS.map((step, index) => (
          <div
            key={step.key}
            className="bg-surface rounded-3xl items-start flex flex-col px-7 pt-7 overflow-hidden flex-1"
          >
            <SectionLabel>
              {t("landing.how.step", { number: index + 1 })}
            </SectionLabel>

            <h3 className="text-lg font-medium mt-4 mb-1.5">
              {t(`landing.how.${step.key}.title`)}
            </h3>
            <p className="leading-snug text-muted-foreground text-sm mb-4">
              {t(`landing.how.${step.key}.body`)}
            </p>

            <img className="mb-2 w-full" src={step.image} alt="" />
          </div>
        ))}
      </div>
    </div>
  );
}
