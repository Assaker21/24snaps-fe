import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ClockIcon,
  HourglassIcon,
  ImagePlusIcon,
  InfinityIcon,
  PencilIcon,
  UserIcon,
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
import IconButton from "../../../../components/IconButton.component";
import SectionLabel from "../../../../components/SectionLabel.component";
import OptionTile from "../../../../components/OptionTile.component";
import Toggle from "../../../../components/Toggle.component";
import eventsService from "../../../../services/events.service";
import attachmentsService from "../../../../services/attachments.service";
import usersService from "../../../../services/users.service";
import uploadFile from "../../../../utils/upload.util";
import { encodeId } from "../../../../utils/idCodec.util";
import { useAuth } from "../../../../contexts/Auth.context";
import { formatCountdown } from "../../../../utils/countdown.util";

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

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRevealMoment(date) {
  return new Date(date).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// The "TIME  [11:00 PM]" row from the reference: a label and the current value as
// a tappable chip, with the wheel picker unfolding underneath only once tapped.
function TimeRow({ value, minTime, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full border-t border-dashed border-border pt-5 mt-5">
      <div className="flex flex-row items-center justify-between">
        <SectionLabel>Time</SectionLabel>
        <OptionTile
          selected={open}
          onClick={() => setOpen((o) => !o)}
          className="px-5 py-3 text-base"
        >
          {formatTime(value)}
        </OptionTile>
      </div>

      {open ? (
        <div className="flex flex-row justify-center w-full pt-4">
          <TimePicker value={value} minTime={minTime} onChange={onChange} />
        </div>
      ) : null}
    </div>
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

  const needsNameStep = isGuest && !user?.firstName;
  const resolvedName = user?.firstName || guestName.trim();

  // Same rule handleCreate applies, surfaced early so the reveal step can show
  // the moment the guests will actually see.
  function resolveRevealAt(v) {
    if (v.reveal == 1) return v.startAt;
    if (v.reveal == 3)
      return new Date(
        v.endAt.getTime() + (v.revealDelayHours || 1) * 3600 * 1000,
      );
    return v.endAt;
  }

  async function handleCreate() {
    setSubmitting(true);
    setError(null);

    const selectedPlan =
      PARTICIPANT_PLANS.find((p) => p.id == value.planId) ||
      PARTICIPANT_PLANS[0];

    const payload = {
      name: value.name,
      startAt: value.startAt,
      endAt: value.endAt,
      revealAt: resolveRevealAt(value),
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
      const storageKey = await uploadFile(
        value.coverFile,
        value.coverFile.type,
        {
          eventId: event.id,
          type: "PICTURE",
          isCover: true,
          fileName: value.coverFile.name,
        },
      );
      // Deliberately not tagged with eventId: the cover shouldn't count
      // against the creator's shot limit or appear in the reveal-gated grid,
      // it's only linked in via event.mainAttachmentId below.
      const attachmentResponse = await attachmentsService.create({
        storageKey,
        type: "PICTURE",
        // Tells the backend to generate the single 1600px cover version instead of
        // the thumb/blur set, and keeps it out of the reveal gate.
        isCover: true,
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
    : ["Our Anniversary", "Our Little Party"];

  const nameStep = {
    title: "What's your name?",
    description:
      "We'll use this to greet you and personalize\nsuggestions for your event.",
    control: () => (
      <Input
        autoFocus
        icon={<PencilIcon size={16} />}
        placeholder="Enter your name"
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
      />
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
              icon={<PencilIcon size={16} />}
              placeholder="Name your film"
              value={value.name}
              onChange={(e) => onChange("name", e.target.value)}
            />

            <SectionLabel className="mt-8 mb-4">Suggestions</SectionLabel>

            <div className="flex flex-col gap-2.5 items-start">
              {nameSuggestions.map((suggestion) => (
                <OptionTile
                  key={suggestion}
                  selected={value.name === suggestion}
                  onClick={() => onChange("name", suggestion)}
                  className="text-[0.95rem]"
                >
                  {suggestion}
                </OptionTile>
              ))}
            </div>
          </div>
        );
      },
    },
    {
      title: "When does your event start?",
      description:
        "Guests can capture photos from this time\nuntil the event closes.",
      control: ({ value, onChange }) => {
        return (
          <div className="flex flex-col items-center w-full">
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
            <TimeRow
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
            />
          </div>
        );
      },
    },
    {
      title: "When does your event finish?",
      description:
        "The film opens now, and guests can capture\nphotos until the film closes at your chosen time.",
      control: ({ value, onChange }) => {
        return (
          <div className="flex flex-col items-center w-full">
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
            <TimeRow
              value={value.endAt}
              minTime={
                equalDates(value.startAt, value.endAt) ? value.startAt : null
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
            />
          </div>
        );
      },
    },
    {
      title: "When should we reveal your photos?",
      description:
        "Photos are hidden by default during the event.\nYou can select when the photos will be revealed.",
      control: ({ value, onChange }) => {
        const revealAt = resolveRevealAt(value);

        return (
          <div className="flex flex-col w-full gap-8">
            {/* Stand-in for the reference's two blurred guest photos: the shape of
                the grid the guests will see, with the moment it unlocks. */}
            <div className="relative grid grid-cols-2 gap-3">
              {["Yen.K", "Brian.S"].map((who) => (
                <div
                  key={who}
                  className="aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-surface-strong via-surface to-brand-soft p-3"
                >
                  <span className="text-xs text-subtle">{who}</span>
                </div>
              ))}
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <span className="flex flex-row items-center gap-2 bg-background/85 backdrop-blur-sm text-foreground text-xs rounded-full px-4 py-2 shadow-sm">
                  <ClockIcon size={13} />
                  Reveals on {formatRevealMoment(revealAt)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 1, label: "During\nEvent" },
                { id: 2, label: "After\nEvent" },
                { id: 3, label: "Additional\nDelay" },
              ].map((button) => (
                <OptionTile
                  key={button.id}
                  selected={value.reveal == button.id}
                  onClick={() => onChange("reveal", button.id)}
                  className="flex flex-col justify-between h-24 py-4"
                >
                  <HourglassIcon size={18} />
                  <span className="whitespace-pre-line text-[0.95rem]">
                    {button.label}
                  </span>
                </OptionTile>
              ))}
            </div>

            {value.reveal == 3 ? (
              <div className="flex flex-col items-center justify-center w-full gap-2">
                <WheelColumn
                  items={Array.from({ length: 24 }, (_, i) => i + 1)}
                  value={(value.revealDelayHours || 1) - 1}
                  onChange={(newIndex) =>
                    onChange("revealDelayHours", newIndex + 1)
                  }
                  itemHeight={wheelSizeConfig.sm.itemHeight}
                  visibleItems={5}
                  className="w-16"
                  ariaLabel="Select hours delay"
                />
                <p className="text-sm text-muted-foreground">
                  hours after the event ends
                </p>
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
        const shots =
          value.shotsPerPerson === -1
            ? "Unlimited shots"
            : `${value.shotsPerPerson} shots available`;
        // endAt starts at "now", so the countdown reads "Ended" until the user
        // picks a finish time — not something to show off in a preview.
        const countdown = formatCountdown(value.endAt);
        const timing = countdown === "Ended" ? "Opens soon" : countdown;

        return (
          <div className="w-full bg-surface rounded-3xl p-5 flex flex-col items-center">
            {/* Live preview of the invitation page, framed like a phone. */}
            <div className="w-44 rounded-[1.75rem] bg-background p-1.5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.25)]">
              <div className="rounded-[1.4rem] overflow-hidden bg-foreground/90 aspect-[9/17] flex flex-col justify-end relative">
                {value.coverPreview ? (
                  <img
                    src={value.coverPreview}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                <div className="relative flex flex-col items-center gap-1.5 p-2.5 pb-3 text-white text-center">
                  <span className="text-[7px] bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5">
                    Invited by {resolvedName || "the host"}
                  </span>
                  <span className="font-serif text-[13px] leading-tight">
                    {value.name || "Your film's name"}
                  </span>
                  <span className="text-[7px] text-white/80">
                    {timing} · {shots}
                  </span>
                  <span className="w-full text-[7px] text-white/70 bg-white/15 rounded-md py-1 mt-0.5">
                    Enter your name
                  </span>
                  <span className="w-full text-[7px] text-foreground bg-white/85 rounded-md py-1 font-medium">
                    Take your camera →
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full border-t border-border mt-5 pt-4 flex flex-row justify-center">
              <label
                className={cn(
                  "flex flex-row items-center gap-2 text-sm font-medium cursor-pointer",
                  "bg-background text-foreground rounded-full py-3 px-5",
                  "transition-transform duration-200 active:scale-95",
                )}
              >
                <ImagePlusIcon size={16} />
                {value.coverPreview ? "Edit cover image" : "Add cover image"}
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
            </div>

            <p className="text-xs text-subtle mt-3 text-center">
              Optional — you can add a cover later.
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
        const shotOptions = [5, 10, 16, 24, 36, -1];
        const unlimitedShots = value.shotsPerPerson === -1;

        if (unlimitedShots) {
          plans = plans.map((plan) => ({
            ...plan,
            price: !plan.price ? 1.99 : Math.floor(plan.price * 2) + 0.99,
          }));
        }
        const selectedPlan = plans.find((p) => p.id == value.planId);

        return (
          <div className="flex flex-col w-full">
            <div className="flex flex-row items-end justify-between w-full gap-4">
              <h4 className="font-serif text-3xl">
                {selectedPlan.number > 0 ? (
                  <>
                    Up to
                    <br />
                    {selectedPlan.number} Participants
                  </>
                ) : (
                  <>
                    Unlimited
                    <br />
                    Participants
                  </>
                )}
              </h4>

              <p className="text-muted-foreground shrink-0 pb-1">
                {selectedPlan.price == 0 ? (
                  "Free"
                ) : selectedPlan.price == -1 ? (
                  <Link to="/">Contact us</Link>
                ) : (
                  `US$${selectedPlan.price}`
                )}
              </p>
            </div>

            {/* One cell per tier, filled left-to-right up to the chosen one — the
                reference's way of showing "how far up the ladder you are". */}
            <div className="flex flex-row gap-1.5 mt-4">
              {plans.map((plan) => (
                <OptionTile
                  key={plan.id}
                  selected={plan.id <= value.planId}
                  onClick={() => onChange("planId", plan.id)}
                  aria-label={
                    plan.number > 0
                      ? `Up to ${plan.number} participants`
                      : "Unlimited participants"
                  }
                  className="flex-1 h-12 px-0 flex items-center justify-center"
                >
                  {plan.id === value.planId ? (
                    plan.number > 0 ? (
                      <UserIcon size={16} />
                    ) : (
                      <InfinityIcon size={16} />
                    )
                  ) : null}
                </OptionTile>
              ))}
            </div>

            <div className="border-t border-border mt-7 pt-6">
              <SectionLabel>Shots per person</SectionLabel>
              <div className="flex flex-row gap-1.5 mt-4">
                {shotOptions.map((shots) => (
                  <OptionTile
                    key={shots}
                    selected={shots === value.shotsPerPerson}
                    tone={shots === -1 ? "success" : "brand"}
                    onClick={() => onChange("shotsPerPerson", shots)}
                    className="flex-1 h-12 px-0 flex items-center justify-center text-base"
                  >
                    {shots > 0 ? shots : <InfinityIcon size={16} />}
                  </OptionTile>
                ))}
              </div>

              {unlimitedShots ? (
                <div className="flex flex-row items-center justify-between gap-3 mt-3 rounded-2xl bg-success-soft border border-success-border px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-[0.95rem] text-success font-medium">
                      Infinite shots for everyone
                    </span>
                    <span className="text-sm text-success/70">
                      To never miss any special moments!
                    </span>
                  </div>
                  <span className="text-[0.95rem] text-success font-medium shrink-0">
                    Only ${selectedPlan.price}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="border-t border-border mt-7 pt-6">
              <SectionLabel>Visibility permissions</SectionLabel>
              <div className="flex flex-row items-center gap-4 mt-4">
                <Toggle
                  checked={value.visibility === 2}
                  onChange={(next) => onChange("visibility", next ? 2 : 1)}
                  label="Only the host can see all photos"
                />
                <span className="text-[0.95rem] text-muted-foreground">
                  {value.visibility === 1
                    ? "Everyone can see all photos."
                    : "Only host can see all photos."}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
  ];

  const onNameStep = needsNameStep && step === 0;
  const isLastStep = step >= steps.length - 1;

  if (authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <form
      className="flex flex-col h-dvh bg-background"
      onSubmit={async (e) => {
        e.preventDefault();
        if (onNameStep && !guestName.trim()) return;

        if (isLastStep) {
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
      <div className="flex flex-row px-4 pt-4 shrink-0">
        <IconButton
          onClick={() => {
            if (step <= 0) {
              navigate(-1);
              return;
            }
            setStep((s) => s - 1);
          }}
          aria-label="Back"
        >
          <ArrowLeftIcon size={18} />
        </IconButton>
      </div>

      <div className="w-full flex flex-col items-center px-6 mt-6 mb-9 shrink-0">
        <h1 className="font-serif text-3xl text-center max-w-[19rem]">
          {steps[step]?.title}
        </h1>
        <p className="text-[0.95rem] text-muted-foreground text-center leading-snug mt-4 whitespace-pre-line">
          {steps[step]?.description}
        </p>
      </div>

      <div className="flex flex-col items-center justify-start flex-1 px-5 pb-6 overflow-y-auto">
        {steps[step]?.control({
          value,
          onChange: (key, next) => setValue((v) => ({ ...v, [key]: next })),
        })}
      </div>

      <div className="relative shrink-0 flex flex-row items-center justify-center px-5 pt-2 pb-5">
        <div className="flex flex-row gap-2">
          {steps.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to step ${index + 1}`}
              aria-current={step === index}
              onClick={() => setStep(index)}
              className={cn(
                "rounded-full size-1.5 transition-colors duration-200 cursor-pointer",
                step === index ? "bg-foreground" : "bg-surface-strong",
              )}
            />
          ))}
        </div>

        {error ? (
          <p className="absolute left-5 right-5 -top-5 text-xs text-danger text-center">
            {error}
          </p>
        ) : null}

        <button
          className={cn(
            "absolute right-5 bottom-5 flex flex-row gap-2 items-center",
            "bg-foreground text-white rounded-2xl px-5 py-3 font-medium cursor-pointer",
            "transition-transform duration-200 active:scale-95",
            "disabled:opacity-45 disabled:pointer-events-none",
          )}
          type="submit"
          disabled={submitting || (onNameStep && !guestName.trim())}
        >
          {isLastStep ? (submitting ? "Creating…" : "Create") : "Next"}
          <ArrowRightIcon size={16} />
        </button>
      </div>

      {submitting ? (
        <div className="fixed inset-0 z-260 bg-background/85 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
          <span className="size-9 rounded-full border-[3px] border-surface-strong border-t-foreground animate-spin" />
          <p className="font-medium">Creating your special film</p>
        </div>
      ) : null}
    </form>
  );
}
