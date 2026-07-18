export default function HowItWorksSection() {
  return (
    <div className="px-4">
      <h3 className="text-sm font-medium uppercase tracking-wider my-4 mt-6">
        How it works
      </h3>
      <p className="font-serif text-2xl mb-6">
        How a Day <br /> Becomes a Film.
      </p>

      <div className="flex flex-col md:flex-row  gap-2">
        {[
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
        ].map((step, index) => {
          return (
            <div className="bg-gray-100 rounded-4xl border border-gray-200 items-start flex flex-col px-8">
              <h3 className="text-sm text-left font-medium uppercase tracking-wider my-4 mt-6 text-gray-500">
                STEP 0{index + 1}
              </h3>

              <h5 className="mb-1">{step.title}</h5>
              <p className="leading-tight text-gray-700 text-sm mb-2">
                {step.description}
              </p>

              <img className="mb-8" src={step.image} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
