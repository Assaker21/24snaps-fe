import {
  ArrowLeftIcon,
  ArrowRightIcon,
  InfinityIcon,
  PlusIcon,
} from "lucide-react";
import { useState } from "react";
import Calendar from "./components/Calendar.component";
import {
  TimePicker,
  WheelColumn,
  wheelSizeConfig,
} from "./components/TimePicker.component";
import cn from "../../../../utils/cn.util";
import { Link, useNavigate } from "react-router";
import Input from "../../../../components/Input.component";
import eventsService from "../../../../services/events.service";
import attachmentsService from "../../../../services/attachments.service";
import usersService from "../../../../services/users.service";
import uploadFile from "../../../../utils/upload.util";
import { encodeId } from "../../../../utils/idCodec.util";
import { useAuth } from "../../../../contexts/Auth.context";

const PARTICIPANT_PLANS = [
  { id: 1, number: 5, price: 0 },
  { id: 2, number: 10, price: 1.99 },
  { id: 3, number: 25, price: 4.99 },
  { id: 4, number: 50, price: 14.99 },
  { id: 5, number: 100, price: 29.99 },
  { id: 6, number: 150, price: 49.99 },
  { id: 7, number: 200, price: 69.99 },
  { id: 8, number: -1, price: 99.99 },
];

function equalDates(d1, d2) {
  return (
    d1.getFullYear() == d2.getFullYear() &&
    d1.getMonth() == d2.getMonth() &&
    d1.getDate() == d2.getDate()
  );
}

export default function CreateEventPage() {
  const { user, setUser, isGuest, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [value, setValue] = useState({
    name: "",
    endAt: new Date(),
    startAt: new Date(),
    reveal: 2,
    revealDelayHours: 1,
    planId: 1,
    shotsPerPerson: 24,
    visibility: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [guestName, setGuestName] = useState("");
  const navigate = useNavigate();

  // Resolved once, the render where auth finishes loading, and frozen from then on so the
  // wizard's step count can't shift under the user mid-flow — e.g. once they've entered
  // their name and it lands on `user`, that shouldn't retroactively remove the step.
  // (React-documented "adjust state during render" pattern — not an effect, so it commits
  // in the same render instead of causing an extra flash.)
  const [needsNameStep, setNeedsNameStep] = useState(null);
  const [resolvedAuthLoading, setResolvedAuthLoading] = useState(authLoading);
  if (authLoading !== resolvedAuthLoading) {
    setResolvedAuthLoading(authLoading);
    if (!authLoading) {
      setNeedsNameStep(isGuest && !user?.firstName);
    }
  }

  const resolvedName = user?.firstName || guestName.trim();

  async function handleCreate() {
    setSubmitting(true);
    setError(null);

    const selectedPlan =
      PARTICIPANT_PLANS.find((p) => p.id == value.planId) ||
      PARTICIPANT_PLANS[0];

    let revealAt = value.endAt;
    if (value.reveal == 1) {
      revealAt = value.startAt;
    } else if (value.reveal == 3) {
      revealAt = new Date(
        value.endAt.getTime() + (value.revealDelayHours || 1) * 3600 * 1000,
      );
    }

    const payload = {
      name: value.name,
      startAt: value.startAt,
      endAt: value.endAt,
      revealAt,
      maxUsers: selectedPlan.number === -1 ? null : selectedPlan.number,
      maxAttachmentsPerUser:
        value.shotsPerPerson === -1 ? null : value.shotsPerPerson,
      visibilityAll: value.visibility === 1,
    };

    const response = await eventsService.create(payload);

    if (!response.ok) {
      setError(response.data?.message || "Something went wrong, try again.");
      setSubmitting(false);
      return;
    }

    const event = response.data;

    if (value.coverFile) {
      const storageKey = await uploadFile(value.coverFile, value.coverFile.type, {
        eventId: event.id,
        type: "PICTURE",
        isCover: true,
        fileName: value.coverFile.name,
      });
      // Deliberately not tagged with eventId: the cover shouldn't count
      // against the creator's shot limit or appear in the reveal-gated grid,
      // it's only linked in via event.mainAttachmentId below.
      const attachmentResponse = await attachmentsService.create({
        storageKey,
        type: "PICTURE",
      });
      if (attachmentResponse.ok) {
        await eventsService.update(event.id, {
          mainAttachmentId: attachmentResponse.data.id,
        });
      }
    }

    if (event.checkoutUrl) {
      window.location.href = event.checkoutUrl;
      return;
    }

    navigate(`/events/${encodeId(event.id)}`);
  }

  const nameSuggestions = resolvedName
    ? [
        `${resolvedName}'s party`,
        `${resolvedName}'s Birthday`,
        `${resolvedName}'s Wedding day`,
        "Our Anniversary",
        "Our Little Party",
      ]
    : [
        "Bloack Head's party",
        "Bloack Head's Birthday",
        "Bloack Head's Wedding day",
        "Our Anniversary",
        "Our Little Party",
      ];

  const nameStep = {
    title: "What's your name?",
    description:
      "We'll use this to greet you and personalize\nsuggestions for your event.",
    control: () => (
      <div className="flex flex-col w-full">
        <Input
          autoFocus
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
        />
      </div>
    ),
  };

  const steps = [
    ...(needsNameStep ? [nameStep] : []),
    {
      title: "What is the name of your event?",
      description:
        "Choose the perfect title for your film.\nThis title will be visible to all of your film guests.",
      control: ({ value, onChange }) => {
        return (
          <div className="flex flex-col w-full">
            <Input
              autoFocus
              value={value.name}
              onChange={(e) => {
                onChange("name", e.target.value);
              }}
            />

            <p className="uppercase tracking-wider text-sm mt-6 mb-3">
              Suggestions
            </p>
            <div className="flex flex-col gap-2 items-start">
              {nameSuggestions.map((suggestion) => {
                return (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onChange("name", suggestion)}
                    className={cn(
                      "bg-white border border-gray-200 rounded-2xl p-2 px-3 text-sm",
                      value.name === suggestion &&
                        "border-black bg-gray-100 text-black font-medium",
                    )}
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
          <div className="flex flex-col items-center justify-center w-full">
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
        "Guests can capture photos until the film closes\nat your chosen time.",
      control: ({ value, onChange }) => {
        return (
          <div className="flex flex-col items-center justify-center w-full">
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
                    key={button.id}
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
              <div className="flex flex-col items-center justify-center mt-8 w-full gap-2">
                <WheelColumn
                  items={[
                    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
                    18, 19, 20, 21, 22, 23, 24,
                  ]}
                  value={(value.revealDelayHours || 1) - 1}
                  onChange={(newIndex) => {
                    onChange("revealDelayHours", newIndex + 1);
                  }}
                  itemHeight={wheelSizeConfig.sm.itemHeight}
                  visibleItems={5}
                  className="w-16"
                  ariaLabel="Select hours delay"
                />
                <p className="text-sm text-gray-500">hours after the event ends</p>
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "Design your film invitation card.",
      description:
        "This cover is the first thing guests see\nwhen they are invited to your film.",
      control: ({ value, onChange }) => {
        return (
          <div className="flex flex-col items-center w-full">
            <label className="w-full aspect-[3/4] max-w-60 rounded-3xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer">
              {value.coverPreview ? (
                <img
                  src={value.coverPreview}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm text-gray-500 px-6 text-center">
                  Tap to choose a cover photo
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  onChange("coverFile", file);
                  onChange("coverPreview", URL.createObjectURL(file));
                }}
              />
            </label>
            <p className="text-xs text-gray-400 mt-4 text-center">
              Optional — you can skip this and add a cover later.
            </p>
          </div>
        );
      },
    },
    {
      title: "How many guests for your film?",
      description:
        "Make sure all guests have a chance to take\nthe most amazing photo from your event.",
      control: ({ value, onChange }) => {
        let plans = PARTICIPANT_PLANS;

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
                      key={plan.id}
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
                      key={shotsPerPerson}
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
                      key={visibility.id}
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

  const onNameStep = needsNameStep && step === 0;

  if (needsNameStep === null) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <form
      className="flex flex-col h-dvh"
      onSubmit={async (e) => {
        e.preventDefault();
        if (onNameStep && !guestName.trim()) return;

        if (step >= steps.length - 1) {
          if (!submitting) handleCreate();
          return;
        }

        if (onNameStep) {
          const trimmed = guestName.trim();
          await usersService.update(user.id, { firstName: trimmed });
          setUser((u) => ({ ...u, firstName: trimmed }));
        }

        setStep((s) => s + 1);
      }}
    >
      <div className="flex flex-row px-2 pt-2">
        <button
          type="button"
          onClick={() => {
            if (step <= 0) {
              navigate(-1);
              return;
            }
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
                  key={index}
                  type="button"
                  className="rounded-full size-3 bg-black"
                />
              );

            return (
              <button
                key={index}
                onClick={() => {
                  setStep(index);
                }}
                type="button"
                className="rounded-full size-3 bg-gray-200"
              />
            );
          })}
        </div>
        {error ? (
          <p className="absolute left-2 bottom-16 right-24 text-xs text-red-600">
            {error}
          </p>
        ) : null}
        <button
          className="absolute right-2 bottom-2 bg-black text-white flex flex-row gap-2 px-3 py-2 rounded-2xl items-center disabled:opacity-50"
          type="submit"
          disabled={submitting || (onNameStep && !guestName.trim())}
        >
          {steps.length - 1 == step
            ? submitting
              ? "Creating…"
              : "Create"
            : "Next"}
          <ArrowRightIcon size={15} />
        </button>
      </div>
    </form>
  );
}
