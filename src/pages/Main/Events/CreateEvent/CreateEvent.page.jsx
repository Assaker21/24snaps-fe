import {
  ArrowLeftIcon,
  ArrowRightIcon,
  InfinityIcon,
  PlusIcon,
} from "lucide-react";
import { useState } from "react";
import Calendar from "./components/Calendar.component";
import { TimePicker } from "./components/TimePicker.component";
import cn from "../../../../utils/cn.util";
import { Link } from "react-router";

function equalDates(d1, d2) {
  return (
    d1.getFullYear() == d2.getFullYear() &&
    d1.getMonth() == d2.getMonth() &&
    d1.getDate() == d2.getDate()
  );
}

export default function CreateEventPage() {
  const [step, setStep] = useState(0);
  const [value, setValue] = useState({
    endAt: new Date(),
    startAt: new Date(),
    reveal: 2,
    planId: 1,
    shotsPerPerson: 24,
    visibility: 1,
  });

  const steps = [
    {
      title: "What is the name of your event?",
      description:
        "Choose the perfect title for your film.\nThis title will be visible to all of your film guests.",
      control: ({ value, onChange }) => {
        return (
          <div className="flex flex-col w-full">
            <input
              autoFocus
              className="bg-gray-100 border border-gray-200 rounded-xl p-2 px-3 focus:outline-none w-full"
              value={value.name}
              onChange={(e) => {
                onChange("name", e.target.value);
              }}
            />

            <p className="uppercase tracking-wider text-sm mt-6 mb-3">
              Suggestions
            </p>
            <div className="flex flex-col gap-2 items-start">
              {[
                "Bloack Head's party",
                "Bloack Head's Birthday",
                "Bloack Head's Wedding day",
                "Our Anniversary",
                "Our Little Party",
              ].map((suggestion) => {
                return (
                  <button
                    type="button"
                    className="bg-white border border-gray-200 rounded-2xl p-2 px-3 text-sm"
                  >
                    {suggestion}
                  </button>
                );
              })}
            </div>
          </div>
        );
      },
    },
    {
      title: "When does your event start?",
      description:
        "Guests can capture photos from this time\n until the event closes.",
      control: ({ value, onChange }) => {
        return (
          <div className="flex flex-col items-center justify-center">
            <Calendar
              disabled={(d) => new Date(Date.now() - 86400000) > d}
              selected={value.startAt}
              onSelect={(newDate) => {
                if (!newDate) return;
                const date = new Date(value.startAt);
                date.setFullYear(newDate.getFullYear());
                date.setMonth(newDate.getMonth());
                date.setDate(newDate.getDate());
                onChange("startAt", date);
              }}
            />
            <div className="px-13 w-full mt-4">
              <div className="flex flex-row justify-between items-center w-full pt-4">
                <TimePicker
                  value={value.startAt}
                  minTime={
                    equalDates(value.startAt, value.endAt) ? new Date() : null
                  }
                  onChange={(newTime) => {
                    if (!newTime) return;
                    const time = new Date(value.startAt);
                    time.setHours(newTime.getHours());
                    time.setMinutes(newTime.getMinutes());
                    time.setSeconds(0);
                    time.setMilliseconds(0);
                    onChange("startAt", time);
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "When does your event finish?",
      description:
        "Guests can capturephotos until the film closes\nat your chosen time.",
      control: ({ value, onChange }) => {
        return (
          <div className="flex flex-col items-center justify-center">
            <Calendar
              disabled={(d) => new Date(value.startAt - 86400000) > d}
              selected={value.endAt}
              onSelect={(newDate) => {
                if (!newDate) return;
                const date = new Date(value.endAt);
                date.setFullYear(newDate.getFullYear());
                date.setMonth(newDate.getMonth());
                date.setDate(newDate.getDate());
                onChange("endAt", date);
              }}
            />
            <div className="px-13 w-full mt-4">
              <div className="flex flex-row justify-between items-center w-full pt-4">
                <TimePicker
                  value={value.endAt}
                  minTime={
                    equalDates(value.startAt, value.endAt)
                      ? value.startAt
                      : null
                  }
                  onChange={(newTime) => {
                    if (!newTime) return;
                    const time = new Date(value.endAt);
                    time.setHours(newTime.getHours());
                    time.setMinutes(newTime.getMinutes());
                    time.setSeconds(0);
                    time.setMilliseconds(0);
                    onChange("endAt", time);
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "When should we reveal your photos?",
      description:
        "Photos are hidden by default during the event.\nYou can select when the photos will be revealed.",
      control: ({ value, onChange }) => {
        return (
          <div className="flex flex-col items-center">
            <div className="flex flex-row items-start gap-2">
              {[
                { id: 1, label: "During Event" },
                { id: 2, label: "After Event" },
                { id: 3, label: "Additional Delay" },
              ].map((button) => {
                return (
                  <button
                    onClick={() => {
                      onChange("reveal", button.id);
                    }}
                    type="button"
                    className={cn(
                      "bg-white border border-gray-200 rounded-2xl p-4 px-5 w-full text-lg flex-1 leading-tight",
                      value.reveal == button.id &&
                        "border-black bg-gray-100 text-black font-medium",
                    )}
                  >
                    {button.label}
                  </button>
                );
              })}
            </div>

            {value.reveal == 3 ? (
              <div className="flex flex-col items-center justify-center mt-8 w-full">
                <Calendar
                  disabled={(d) => new Date(value.startAt - 86400000) > d}
                  selected={value.endAt}
                  onSelect={(newDate) => {
                    if (!newDate) return;
                    const date = new Date(value.endAt);
                    date.setFullYear(newDate.getFullYear());
                    date.setMonth(newDate.getMonth());
                    date.setDate(newDate.getDate());
                    onChange("endAt", date);
                  }}
                />
                <div className="px-13 w-full">
                  <div className="flex flex-row justify-between items-center w-full pt-4">
                    <TimePicker
                      value={value.endAt}
                      minTime={
                        equalDates(value.startAt, value.endAt)
                          ? value.startAt
                          : null
                      }
                      onChange={(newTime) => {
                        if (!newTime) return;
                        const time = new Date(value.endAt);
                        time.setHours(newTime.getHours());
                        time.setMinutes(newTime.getMinutes());
                        time.setSeconds(0);
                        time.setMilliseconds(0);
                        onChange("endAt", time);
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      },
    },
    // {
    //   title: "Which camera would you like to use?",
    //   description:
    //     "Choose a camera that fits your style.\n*Original photos are saved by default.",
    //   control: ({ value, onChange }) => {
    //     return (
    //       <div className="flex flex-col">
    //         <input
    //           value={value.name}
    //           onChange={(e) => {
    //             onChange("name", e.target.value);
    //           }}
    //         />

    //         <p>Suggestions</p>
    //         <div className="flex flex-col gap-2">
    //           {[
    //             "Bloack Head's party",
    //             "Bloack Head's Birthday",
    //             "Bloack Head's Wedding day",
    //             "Our Anniversary",
    //             "Our Little Party",
    //           ].map((suggestion) => {
    //             return;
    //           })}
    //         </div>
    //       </div>
    //     );
    //   },
    // },
    // {
    //   title: "Design your film invitation card.",
    //   description:
    //     "This cover is the first thing guests see\nwhen they are invited to your film.",
    //   control: ({ value, onChange }) => {
    //     return (
    //       <div className="flex flex-col">
    //         <input
    //           value={value.name}
    //           onChange={(e) => {
    //             onChange("name", e.target.value);
    //           }}
    //         />

    //         <p>Suggestions</p>
    //         <div className="flex flex-col gap-2">
    //           {[
    //             "Bloack Head's party",
    //             "Bloack Head's Birthday",
    //             "Bloack Head's Wedding day",
    //             "Our Anniversary",
    //             "Our Little Party",
    //           ].map((suggestion) => {
    //             return;
    //           })}
    //         </div>
    //       </div>
    //     );
    //   },
    // },
    {
      title: "How many guests for your film?",
      description:
        "Make sure all guests have a chance to take\nthe most amazing photo from your event.",
      control: ({ value, onChange }) => {
        let plans = [
          { id: 1, number: 5, price: 0 },
          { id: 2, number: 10, price: 1.99 },
          { id: 3, number: 25, price: 4.99 },
          { id: 4, number: 50, price: 14.99 },
          { id: 5, number: 100, price: 29.99 },
          { id: 6, number: 150, price: 49.99 },
          { id: 7, number: 200, price: 69.99 },
          { id: 8, number: -1, price: 99.99 },
        ];

        const shotsPerPerson = [5, 10, 16, 24, 36, -1];

        if (value.shotsPerPerson == -1) {
          plans = plans.map((plan) => ({
            ...plan,
            price: !plan.price ? 1.99 : Math.floor(plan.price * 2) + 0.99,
          }));
        }
        const selectedPlan = plans.find((p) => p.id == value.planId);
        return (
          <div className="flex flex-col w-full">
            <div className="flex flex-col gap-2 w-full">
              <div className="flex flex-row items-end justify-between w-full">
                <h4 className="font-serif text-xl">
                  {selectedPlan.number > 0 ? (
                    <>
                      Up to
                      <br />
                      {selectedPlan?.number} Participants
                    </>
                  ) : (
                    <>
                      Unlimited
                      <br />
                      Participants
                    </>
                  )}
                </h4>

                {selectedPlan.price == 0 ? (
                  <p>Free</p>
                ) : selectedPlan.price == -1 ? (
                  <Link>Contact us</Link>
                ) : (
                  <p>${selectedPlan?.price}</p>
                )}
              </div>
              <div className="flex flex-row gap-1 flex-wrap">
                {plans.map((plan) => {
                  return (
                    <button
                      onClick={() => {
                        onChange("planId", plan.id);
                      }}
                      type="button"
                      className={cn(
                        "bg-white border border-gray-200 rounded-2xl size-10 w-full text-lg flex-1 leading-tight flex items-center justify-center",
                        plan.id <= value.planId &&
                          "border-black bg-gray-100 text-black font-medium",
                      )}
                    >
                      {plan.number > 0 ? (
                        plan.id >= value.planId ? (
                          plan.number
                        ) : (
                          ""
                        )
                      ) : (
                        <InfinityIcon size={15} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full mt-8">
              <div className="flex flex-row items-end justify-between w-full">
                <h4 className="font-serif text-xl">Shots per person</h4>
              </div>
              <div className="flex flex-row gap-1 flex-wrap">
                {shotsPerPerson.map((shotsPerPerson) => {
                  return (
                    <button
                      onClick={() => {
                        onChange("shotsPerPerson", shotsPerPerson);
                      }}
                      type="button"
                      className={cn(
                        "bg-white border border-gray-200 rounded-2xl size-10 w-full text-lg flex-1 leading-tight flex items-center justify-center",
                        shotsPerPerson == value.shotsPerPerson &&
                          "border-black bg-gray-100 text-black font-medium",
                      )}
                    >
                      {shotsPerPerson > 0 ? (
                        shotsPerPerson
                      ) : (
                        <InfinityIcon size={15} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full mt-8">
              <div className="flex flex-row items-end justify-between w-full">
                <h4 className="font-serif text-xl">Visibility permissions</h4>
              </div>
              <div className="flex flex-row gap-1 flex-wrap">
                {[
                  { id: 1, label: "Everyone can see all photos" },
                  { id: 2, label: "Each one can see their own photos" },
                ].map((visibility) => {
                  return (
                    <button
                      onClick={() => {
                        onChange("visibility", visibility.id);
                      }}
                      type="button"
                      className={cn(
                        "bg-white border border-gray-200 rounded-2xl py-4 px-4 w-full text-lg flex-1 leading-tight flex items-center justify-center",
                        visibility.id == value.visibility &&
                          "border-black bg-gray-100 text-black font-medium",
                      )}
                    >
                      {visibility.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <form
      className="flex flex-col h-screen"
      onSubmit={(e) => {
        e.preventDefault();
        setStep((s) => ++s);
      }}
    >
      <div className="flex flex-row px-2 pt-2">
        <button
          type="button"
          onClick={() => {
            setStep((s) => --s);
          }}
          className="bg-gray-200 text-gray-800 border border-gray-200 flex flex-row gap-2 size-10 rounded-2xl items-center justify-center "
        >
          <ArrowLeftIcon size={15} />
        </button>
      </div>

      <div className="w-full flex flex-col items-center mt-8 mb-10">
        <h4 className="font-serif text-2xl pb-4 text-center max-w-60 mb-0">
          {steps[step]?.title}
        </h4>
        <p className="text-sm px-8 text-center mt-0 leading-tight">
          {steps[step]?.description.split("\n").reduce((prev, curr) => {
            if (!prev) return curr;
            return (
              <>
                {prev}
                <br />
                {curr}
              </>
            );
          }, "")}
        </p>
      </div>

      <div className="flex flex-col items-start justify-start flex-1 px-4 overflow-y-auto h-full max-h-[calc(100vh-322px)]">
        {steps[step]?.control({
          value,
          onChange: (key, value) => {
            setValue((v) => ({ ...v, [key]: value }));
          },
        })}
      </div>

      <div className="flex flex-col items-center justify-center relativeh h-14 px-2">
        <div className="flex flex-row gap-2">
          {steps.map((_, index) => {
            if (step == index)
              return (
                <button
                  type="button"
                  className="rounded-full size-3 bg-black"
                />
              );

            return (
              <button
                onClick={() => {
                  setStep(index);
                }}
                type="button"
                className="rounded-full size-3 bg-gray-200"
              />
            );
          })}
        </div>
        <button
          className="absolute right-2 bottom-2 bg-black text-white flex flex-row gap-2 px-3 py-2 rounded-2xl items-center"
          type="submit"
        >
          {steps.length - 1 == step ? "Submit" : "Next"}
          <ArrowRightIcon size={15} />
        </button>
      </div>
    </form>
  );
}
