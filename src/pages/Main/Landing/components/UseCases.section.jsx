import {
  CakeIcon,
  FishIcon,
  HeartIcon,
  MicIcon,
  PlaneIcon,
} from "lucide-react";
import SectionLabel from "../../../../components/SectionLabel.component";
import { useT } from "../../../../contexts/I18n.context";

const USE_CASES = [
  { Icon: HeartIcon, key: "wedding" },
  { Icon: CakeIcon, key: "birthday" },
  { Icon: PlaneIcon, key: "trip" },
  { Icon: MicIcon, key: "party" },
  { Icon: FishIcon, key: "everyday" },
];

export default function UseCasesSection() {
  const t = useT();

  return (
    <div className="bg-surface rounded-3xl mx-4 items-center flex flex-col pt-8 overflow-hidden">
      <SectionLabel className="text-center">
        {t("landing.useCases.label")}
      </SectionLabel>

      <p className="font-serif text-3xl text-center mt-4 mb-8 px-6 whitespace-pre-line">
        {t("landing.useCases.quote")}
      </p>

      <div className="flex flex-row flex-wrap gap-2 justify-center px-5 mb-8">
        {USE_CASES.map(({ Icon, key }) => (
          <span
            key={key}
            className="bg-background rounded-full flex flex-row gap-2 items-center px-4 py-2 text-sm"
          >
            <Icon size={15} /> {t(`landing.useCases.${key}`)}
          </span>
        ))}
      </div>

      <img
        src="uncached-main.webp"
        alt=""
        className="w-[calc(100%-20px)] max-w-200"
      />
    </div>
  );
}
