import {
  CakeIcon,
  FishIcon,
  HeartIcon,
  MicIcon,
  PlaneIcon,
} from "lucide-react";
import SectionLabel from "../../../../components/SectionLabel.component";

const USE_CASES = [
  { Icon: HeartIcon, label: "Wedding" },
  { Icon: CakeIcon, label: "Birthday" },
  { Icon: PlaneIcon, label: "Trip" },
  { Icon: MicIcon, label: "Party" },
  { Icon: FishIcon, label: "Just everyday" },
];

export default function UseCasesSection() {
  return (
    <div className="bg-surface rounded-3xl mx-4 items-center flex flex-col pt-8 overflow-hidden">
      <SectionLabel className="text-center">Use cases</SectionLabel>

      <p className="font-serif text-3xl text-center mt-4 mb-8 px-6">
        “Your guests
        <br />
        captured moments
        <br />
        you never saw.”
      </p>

      <div className="flex flex-row flex-wrap gap-2 justify-center px-5 mb-8">
        {USE_CASES.map(({ Icon, label }) => (
          <span
            key={label}
            className="bg-background rounded-full flex flex-row gap-2 items-center px-4 py-2 text-sm"
          >
            <Icon size={15} /> {label}
          </span>
        ))}
      </div>

      <img
        src="https://framerusercontent.com/images/yE5qTYqfi86r0Wy4jK6SdnWI.png?scale-down-to=2048&width=2694&height=2888"
        alt=""
        className="w-[calc(100%-20px)] max-w-200"
      />
    </div>
  );
}
