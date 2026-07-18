import {
  CakeIcon,
  FishIcon,
  HeartIcon,
  MicIcon,
  PlaneIcon,
} from "lucide-react";

export default function UseCasesSection() {
  return (
    <div className="bg-gray-100 rounded-4xl border border-gray-200 mx-3 items-center flex flex-col">
      <h3 className="text-center text-sm font-medium uppercase tracking-wider my-4 mt-6">
        Use cases
      </h3>

      <p className="font-serif text-2xl text-center mb-8">
        “Your guests
        <br />
        captured moments
        <br />
        you never saw.”
      </p>

      <div className="flex flex-row flex-wrap gap-2 justify-center px-5 mb-8">
        {[
          {
            Icon: HeartIcon,
            label: "Wedding",
          },
          {
            Icon: CakeIcon,
            label: "Birthday",
          },
          {
            Icon: PlaneIcon,
            label: "Trip",
          },
          {
            Icon: MicIcon,
            label: "Party",
          },
          {
            Icon: FishIcon,
            label: "Just everyday",
          },
        ].map((button) => {
          return (
            <button className="bg-gray-200 border rounded-2xl border-gray-300 flex flex-row gap-2 items-center px-3 py-2 text-sm cursor-pointer ">
              <button.Icon size={15} /> {button.label}
            </button>
          );
        })}
      </div>

      <img
        src="https://framerusercontent.com/images/yE5qTYqfi86r0Wy4jK6SdnWI.png?scale-down-to=2048&width=2694&height=2888"
        className="w-[calc(100%-20px)] py-3 max-w-200"
      />
    </div>
  );
}
