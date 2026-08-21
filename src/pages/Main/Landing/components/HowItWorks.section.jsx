import SectionLabel from "../../../../components/SectionLabel.component";

const STEPS = [
  {
    title: "Create a film",
    description:
      "Name your film, set how long it will stay open, and what kind of moment it's for.",
    image:
      "https://framerusercontent.com/images/nbJu7pbg8K44KjKnQE8Uw0AQh8.png?scale-down-to=1024&width=917&height=1251",
  },
  {
    title: "Invite your people",
    description:
      "Share your film link or QR code and invite friends to capture the day with you.",
    image:
      "https://framerusercontent.com/images/Wpb8D1YohQ6vf39qDAsiIw52iA.png?scale-down-to=1024&width=917&height=1251",
  },
  {
    title: "Capture Together",
    description:
      "Take photos throughout the day, every shot fills your shared film roll.",
    image:
      "https://framerusercontent.com/images/YmMNMwkowrw0xd36ao8AhiT4QI.png?scale-down-to=1024&width=1076&height=1251",
  },
];

export default function HowItWorksSection() {
  return (
    <div className="px-4 pt-14">
      <SectionLabel>How it works</SectionLabel>

      <h2 className="font-serif text-3xl mt-4 mb-6">
        How a Day <br /> Becomes a Film.
      </h2>

      <div className="flex flex-col md:flex-row gap-3">
        {STEPS.map((step, index) => (
          <div
            key={step.title}
            className="bg-surface rounded-3xl items-start flex flex-col px-7 pt-7 overflow-hidden flex-1"
          >
            <SectionLabel>Step 0{index + 1}</SectionLabel>

            <h3 className="text-lg font-medium mt-4 mb-1.5">{step.title}</h3>
            <p className="leading-snug text-muted-foreground text-sm mb-4">
              {step.description}
            </p>

            <img className="mb-2 w-full" src={step.image} alt="" />
          </div>
        ))}
      </div>
    </div>
  );
}
