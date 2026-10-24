import {
  AlarmClockIcon,
  ArrowLeftIcon,
  CakeIcon,
  GiftIcon,
  HeartIcon,
  PlaneIcon,
  SparklesIcon,
  ArrowRightIcon,
  ClockIcon,
  EyeIcon,
  HourglassIcon,
  ImagePlusIcon,
  InfinityIcon,
  PencilIcon,
  UserIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import AlertDialog from "../../../../components/AlertDialog.component";
import LoadingScreen from "../../../../components/LoadingScreen.component";
import TopBar from "../../../../components/TopBar.component";
import eventsService from "../../../../services/events.service";
import attachmentsService from "../../../../services/attachments.service";
import usersService from "../../../../services/users.service";
import templatesService from "../../../../services/templates.service";
import uploadFile from "../../../../utils/upload.util";
import { encodeId } from "../../../../utils/idCodec.util";
import { useAuth } from "../../../../contexts/Auth.context";
import { useT } from "../../../../contexts/I18n.context";
import useFormat from "../../../../hooks/useFormat.hook";
import { DEFAULT_COVER_SRC } from "../../../../utils/cover.util";
import { eventTypeName } from "../../../../utils/eventType.util";
import useSeo from "../../../../hooks/useSeo.hook";
import PaymentSheet from "../../../../components/PaymentSheet.component";
import {
  PARTICIPANT_PLANS,
  computePrice,
  withUnlimitedShots,
} from "../../../../utils/pricing.util";

// One glyph per kind of event, keyed by the code the catalogue ships. A type the
// backend adds later still renders — it just falls back to the generic sparkle rather
// than needing a frontend release to appear at all.
const EVENT_TYPE_ICONS = {
  wedding: HeartIcon,
  party: SparklesIcon,
  birthday: CakeIcon,
  travel: PlaneIcon,
  other: GiftIcon,
};

function equalDates(d1, d2) {
  return (
    d1.getFullYear() == d2.getFullYear() &&
    d1.getMonth() == d2.getMonth() &&
    d1.getDate() == d2.getDate()
  );
}

// A picker that unfolds below the fold is a picker the user doesn't know appeared —
// bring it into view once it's on screen. rAF waits for the layout that mounting it
// caused, so the scroll targets the element's final position.
function useScrollIntoViewWhen(shown) {
  const ref = useRef(null);

  useEffect(() => {
    if (!shown) return;

    const frame = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => cancelAnimationFrame(frame);
  }, [shown]);

  return ref;
}

// The "TIME  [11:00 PM]" row from the reference: a label and the current value as
// a tappable chip, with the wheel picker unfolding underneath only once tapped.
function TimeRow({ value, minTime, onChange }) {
  const t = useT();
  const fmt = useFormat();
  const [open, setOpen] = useState(false);
  const pickerRef = useScrollIntoViewWhen(open);

  return (
    <div className="w-full border-t border-dashed border-border pt-5 mt-5">
      <div className="flex flex-row items-center justify-between">
        <SectionLabel>{t("create.time")}</SectionLabel>
        <OptionTile
          selected={open}
          onClick={() => setOpen((o) => !o)}
          className="px-5 py-3 text-base"
        >
          {fmt.time(value)}
        </OptionTile>
      </div>

      {open ? (
        <div
          ref={pickerRef}
          className="flex flex-row justify-center w-full pt-4 scroll-mt-6 scroll-mb-6"
        >
          <TimePicker value={value} minTime={minTime} onChange={onChange} />
        </div>
      ) : null}
    </div>
  );
}

// Extracted from the reveal step's render so the wheel can own a ref and scroll itself
// into view the moment "Additional Delay" is chosen.
function RevealDelayRow({ hours, onChange }) {
  const t = useT();
  const wheelRef = useScrollIntoViewWhen(true);

  return (
    <div
      ref={wheelRef}
      className="flex flex-col items-center justify-center w-full gap-2 scroll-mb-6"
    >
      <WheelColumn
        items={Array.from({ length: 24 }, (_, i) => i + 1)}
        value={(hours || 1) - 1}
        onChange={(newIndex) => onChange(newIndex + 1)}
        itemHeight={wheelSizeConfig.sm.itemHeight}
        visibleItems={5}
        className="w-16"
        ariaLabel={t("create.reveal.hoursLabel")}
      />
      <p className="text-sm text-muted-foreground">
        {t("create.reveal.hoursAfter")}
      </p>
    </div>
  );
}

// The wizard no longer asks when an event opens — it opens the moment it's created —
// so the only date the user picks is the one it closes on. A day out is both the
// app's namesake window and a finish time that is already valid if left alone.
function defaultEndAt() {
  const end = new Date();
  end.setDate(end.getDate() + 1);
  return end;
}

function firstProblem(stepsToCheck, value) {
  for (const step of stepsToCheck) {
    const problem = step?.validate?.(value);
    if (problem) return problem;
  }
  return null;
}

// The wizard only mounts once the session is known, which is what makes `needsNameStep`
// below safe to latch. Keeping the gate out here rather than returning early from the
// wizard matters: a hook can't be told to re-initialise, so the wizard must not exist
// until there is a real answer to initialise from.
export default function CreateEventPage() {
  const t = useT();
  useSeo({ title: t("landing.how.create.title") });

  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingScreen message={t("create.loading")} />;
  }

  return <CreateEventWizard />;
}

function CreateEventWizard() {
  const { user, setUser, isGuest } = useAuth();
  const t = useT();
  const fmt = useFormat();
  const [step, setStep] = useState(0);
  const [eventTypes, setEventTypes] = useState([]);
  const [value, setValue] = useState({
    name: "",
    eventTypeId: null,
    endAt: defaultEndAt(),
    reveal: 2,
    revealDelayHours: 1,
    planId: 1,
    shotsPerPerson: 24,
    visibility: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);
  const [guestName, setGuestName] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const navigate = useNavigate();

  // Latched at mount, never recomputed. Answering this step writes a `firstName` to
  // the account — and signing in mid-wizard gives it an email — either of which makes
  // `isGuest && !firstName` false, which used to drop this step straight out of the
  // `steps` array. Every later step then shifted down one index, so pressing Next from
  // the name step landed on the step *after* the event-type one: the wizard appeared to
  // skip asking what kind of event it was, but only for the guests who were asked
  // their name first.
  const [needsNameStep] = useState(() => isGuest && !user?.firstName);
  const resolvedName = user?.firstName || guestName.trim();

  // The kinds of event are catalogue data, not a constant — which cards a host is
  // offered later hangs off the one they pick here.
  useEffect(() => {
    templatesService.getEventTypes().then((response) => {
      if (response.ok) setEventTypes(response.data);
    });
  }, []);

  const selectedType = eventTypes.find((t) => t.id === value.eventTypeId);

  // Same rule handleCreate applies, surfaced early so the reveal step can show
  // the moment the guests will actually see. "During Event" resolves to the event's
  // start, which is now always the moment it's created — so, effectively, right away.
  function resolveRevealAt(v, startAt = new Date()) {
    if (v.reveal == 1) return startAt;
    if (v.reveal == 3)
      return new Date(
        v.endAt.getTime() + (v.revealDelayHours || 1) * 3600 * 1000,
      );
    return v.endAt;
  }

  // What the event will cost, from the same tier table the server charges from. A free
  // event never sees a payment method, so this is also what decides whether the sheet
  // opens at all.
  const price = computePrice({
    planId: value.planId,
    shotsPerPerson: value.shotsPerPerson,
  });

  async function handleCreate() {
    setSubmitting(true);
    setError(null);

    const selectedPlan =
      PARTICIPANT_PLANS.find((p) => p.id == value.planId) ||
      PARTICIPANT_PLANS[0];

    // Events open on creation — there is no step asking when, so this is the only
    // place startAt comes from.
    const startAt = new Date();

    const payload = {
      name: value.name,
      startAt,
      endAt: value.endAt,
      revealAt: resolveRevealAt(value, startAt),
      maxUsers: selectedPlan.number === -1 ? null : selectedPlan.number,
      maxAttachmentsPerUser:
        value.shotsPerPerson === -1 ? null : value.shotsPerPerson,
      visibilityAll: value.visibility === 1,
      eventTypeId: value.eventTypeId,
    };

    const response = await eventsService.create(payload);

    if (!response.ok) {
      setError(response.data?.message || t("common.somethingWentWrong"));
      setSubmitting(false);
      return;
    }

    const event = response.data;

    if (value.coverFile) {
      // A cover that won't upload is not worth losing the event over — it can be set
      // from the event's own settings afterwards.
      try {
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
      } catch (uploadError) {
        console.warn("Cover upload failed:", uploadError);
      }
    }

    if (event.checkoutUrl) {
      window.location.href = event.checkoutUrl;
      return;
    }

    // The event exists but checkout couldn't be started — the provider was
    // unreachable, or its credentials are wrong. The event's own screen offers the
    // retry, so send them there rather than stranding them on a wizard whose work is
    // already saved.
    navigate(`/events/${encodeId(event.id)}`);
  }

  // Suggestions follow the kind of event just chosen — the step before this one has
  // already been answered, so there is no reason to keep offering a wedding name to
  // someone setting up a birthday.
  // Three per kind of event, from the catalogue. The ones that greet the host by
  // name are dropped entirely when we don't have one yet, rather than rendering a
  // dangling possessive — so each is probed for a {name} placeholder first, which is
  // also why this can't be a plain list of keys.
  const suggestionKey = ["wedding", "party", "birthday", "travel"].includes(
    selectedType?.code,
  )
    ? selectedType.code
    : "other";

  const nameSuggestions = [1, 2, 3]
    .map((n) => {
      const key = `create.suggest.${suggestionKey}${n}`;
      const probe = "\u0000";
      if (!resolvedName && t(key, { name: probe }).includes(probe)) return null;
      return t(key, { name: resolvedName });
    })
    .filter(Boolean);

  const nameStep = {
    title: t("create.name.title"),
    description: t("create.name.body"),
    control: () => (
      <Input
        icon={<PencilIcon size={16} />}
        placeholder={t("create.name.placeholder")}
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
      />
    ),
  };

  const typeStep = {
    title: t("create.type.title"),
    description: t("create.type.body"),
    validate: (v) =>
      !v.eventTypeId
        ? {
            title: t("create.type.problem.title"),
            message: t("create.type.problem.body"),
          }
        : null,
    control: ({ value, onChange }) => (
      <div className="grid grid-cols-2 gap-2.5 w-full">
        {eventTypes.map((type) => {
          const Icon = EVENT_TYPE_ICONS[type.code] || SparklesIcon;

          return (
            <OptionTile
              key={type.id}
              selected={value.eventTypeId === type.id}
              onClick={() => onChange("eventTypeId", type.id)}
              className="flex flex-col justify-between h-24 py-4"
            >
              <Icon size={18} />
              <span className="text-[0.95rem]">{eventTypeName(t, type)}</span>
            </OptionTile>
          );
        })}
      </div>
    ),
  };

  const steps = [
    ...(needsNameStep ? [nameStep] : []),
    typeStep,
    {
      title: t("create.eventName.title"),
      description: t("create.eventName.body"),
      control: ({ value, onChange }) => {
        return (
          <div className="flex flex-col w-full pt-0.5">
            <Input
              icon={<PencilIcon size={16} />}
              placeholder={t("create.eventName.placeholder")}
              value={value.name}
              onChange={(e) => onChange("name", e.target.value)}
            />

            <SectionLabel className="mt-8 mb-4">
              {t("create.eventName.suggestions")}
            </SectionLabel>

            <div className="flex flex-col gap-2.5 items-start rtl:items-end">
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
      title: t("create.endAt.title"),
      description: t("create.endAt.body"),
      validate: (v) =>
        new Date(v.endAt) <= new Date()
          ? {
              title: t("create.endAt.problem.title"),
              message: t("create.endAt.problem.body"),
            }
          : null,
      control: ({ value, onChange }) => {
        return (
          <div className="flex flex-col items-center w-full">
            <Calendar
              disabled={(d) => new Date(Date.now() - 86400000) > d}
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
              // Closing today means the wheel must not offer a time that has
              // already passed — the event is open by then.
              minTime={equalDates(new Date(), value.endAt) ? new Date() : null}
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
      title: t("create.reveal.title"),
      description: t("create.reveal.body"),
      control: ({ value, onChange }) => {
        const revealAt = resolveRevealAt(value);

        return (
          <div className="flex flex-col w-full gap-8">
            {/* The reference's two blurred guest photos — the grid as the guests will
                see it before reveal time, with the moment it unlocks. The files ship
                already blurred, so there is nothing sharp here to peek at. */}
            <div className="relative grid grid-cols-2 gap-3">
              {[
                {
                  name: t("create.reveal.sampleGuest1"),
                  src: "/blurred-layla.jpg",
                },
                {
                  name: t("create.reveal.sampleGuest2"),
                  src: "/blurred-samir.jpg",
                },
              ].map(({ name, src }) => (
                <div
                  key={name}
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-surface-strong"
                >
                  <img
                    src={src}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2.5 start-3 font-serif italic text-white text-lg drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
                    {name}
                  </span>
                </div>
              ))}
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <span className="flex flex-row items-center gap-2 bg-background/85 backdrop-blur-sm text-foreground text-xs rounded-full px-4 py-2 shadow-sm">
                  <ClockIcon size={13} />
                  {t("create.reveal.revealsOn", {
                    moment: fmt.moment(revealAt),
                  })}
                </span>
              </div>
            </div>

            {/* One glyph per option — they're the only thing distinguishing the three
                tiles at a glance, so they can't all be the same hourglass. */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 1, label: t("create.reveal.during"), Icon: EyeIcon },
                { id: 2, label: t("create.reveal.after"), Icon: HourglassIcon },
                {
                  id: 3,
                  label: t("create.reveal.delay"),
                  Icon: AlarmClockIcon,
                },
              ].map(({ id, label, Icon }) => (
                <OptionTile
                  key={id}
                  selected={value.reveal == id}
                  onClick={() => onChange("reveal", id)}
                  className="flex flex-col justify-between h-24 py-4"
                >
                  <Icon size={18} />
                  <span className="whitespace-pre-line text-[0.95rem]">
                    {label}
                  </span>
                </OptionTile>
              ))}
            </div>

            {value.reveal == 3 ? (
              <RevealDelayRow
                hours={value.revealDelayHours}
                onChange={(hours) => onChange("revealDelayHours", hours)}
              />
            ) : null}
          </div>
        );
      },
    },
    {
      title: t("create.cover.title"),
      description: t("create.cover.body"),
      control: ({ value, onChange }) => {
        const shots =
          value.shotsPerPerson === -1
            ? t("invitation.unlimitedShots")
            : t("invitation.shotsAvailable", { count: value.shotsPerPerson });
        // A finish time can still be dragged back into the past on the previous
        // step, and "Ended" is not something to show off in an invitation preview.
        const countdown = fmt.countdown(value.endAt);
        const timing =
          countdown === t("countdown.ended")
            ? t("countdown.opensSoon")
            : countdown;

        return (
          <div className="w-full bg-surface rounded-3xl p-5 flex flex-col items-center">
            {/* Live preview of the invitation page, framed like a phone. */}
            <div className="w-44 rounded-[1.75rem] bg-background p-1.5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.25)]">
              <div className="rounded-[1.4rem] overflow-hidden bg-foreground/90 aspect-[9/17] flex flex-col justify-end relative">
                {/* Skipping the cover isn't an empty card — guests see the shipped
                    default, so the preview shows that rather than a black rectangle. */}
                <img
                  src={value.coverPreview || DEFAULT_COVER_SRC}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                <div className="relative flex flex-col items-center gap-1.5 p-2.5 pb-3 text-white text-center">
                  <span className="text-[7px] bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5">
                    {t("create.cover.invitedBy", {
                      name: resolvedName || t("create.cover.theHost"),
                    })}
                  </span>
                  <span className="font-serif text-[13px] leading-tight">
                    {value.name || t("create.cover.yourEventName")}
                  </span>
                  <span className="text-[7px] text-white/80">
                    {timing} · {shots}
                  </span>
                  <span className="w-full text-[7px] text-white/70 bg-white/15 rounded-md py-1 mt-0.5">
                    {t("create.cover.enterName")}
                  </span>
                  <span className="w-full text-[7px] text-foreground bg-white/85 rounded-md py-1 font-medium">
                    {t("create.cover.takeCamera")}
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
                {value.coverPreview
                  ? t("create.cover.edit")
                  : t("create.cover.add")}
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
              {t("create.cover.optional")}
            </p>
          </div>
        );
      },
    },
    {
      title: t("create.guests.title"),
      description: t("create.guests.body"),
      control: ({ value, onChange }) => {
        let plans = PARTICIPANT_PLANS;
        const shotOptions = [5, 10, 16, 24, 36, -1];
        const unlimitedShots = value.shotsPerPerson === -1;

        if (unlimitedShots) {
          plans = plans.map((plan) => ({
            ...plan,
            price: withUnlimitedShots(plan.price),
          }));
        }
        const selectedPlan = plans.find((p) => p.id == value.planId);

        return (
          <div className="flex flex-col w-full">
            <div className="flex flex-row items-end justify-between w-full gap-4">
              <h4 className="font-serif text-3xl">
                {selectedPlan.number > 0
                  ? t("create.guests.upTo", { count: selectedPlan.number })
                  : t("create.guests.unlimited")}
              </h4>

              <p className="text-muted-foreground shrink-0 pb-1">
                {selectedPlan.price == 0 ? (
                  t("common.free")
                ) : selectedPlan.price == -1 ? (
                  <Link to="/">{t("create.guests.contactUs")}</Link>
                ) : (
                  fmt.money(selectedPlan.price)
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
                      ? t("create.guests.upToLabel", { count: plan.number })
                      : t("create.guests.unlimitedLabel")
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
              <SectionLabel>{t("create.shots.label")}</SectionLabel>
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
                      {t("create.shots.unlimitedTitle")}
                    </span>
                    <span className="text-sm text-success/70">
                      {t("create.shots.unlimitedBody")}
                    </span>
                  </div>
                  <span className="text-[0.95rem] text-success font-medium shrink-0">
                    {t("create.shots.onlyPrice", {
                      price: fmt.money(selectedPlan.price),
                    })}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="border-t border-border mt-7 pt-6">
              <SectionLabel>{t("create.visibility.label")}</SectionLabel>
              {/* The caption used to be a <label for="visibility">, which never did
                  anything: a label can only point at a form control, and the toggle is
                  a button. It is a button of its own now, so tapping the sentence
                  flips the switch the way it looks like it should. */}
              <div className="flex flex-row items-center gap-4 mt-4">
                <Toggle
                  checked={value.visibility === 1}
                  onChange={(next) => onChange("visibility", !next ? 2 : 1)}
                  label={t("settings.everyoneSees")}
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange("visibility", value.visibility === 1 ? 2 : 1)
                  }
                  className="text-[0.95rem] text-muted-foreground text-left cursor-pointer"
                >
                  {value.visibility === 1
                    ? t("create.visibility.everyone")
                    : t("create.visibility.hostOnly")}
                </button>
              </div>
            </div>
          </div>
        );
      },
    },
  ];

  const onNameStep = needsNameStep && step === 0;
  const isLastStep = step >= steps.length - 1;

  return (
    <form
      className="flex flex-col h-dvh bg-background"
      onSubmit={async (e) => {
        e.preventDefault();
        if (onNameStep && !guestName.trim()) return;

        // A step that can be filled in wrongly says so here rather than letting the
        // wizard advance and failing at create time. The last step re-checks every
        // step, since the dots let the user skip past one.
        const problem = firstProblem(isLastStep ? steps : [steps[step]], value);
        if (problem) {
          setAlert(problem);
          return;
        }

        if (isLastStep) {
          if (submitting) return;
          // A paid event names its payment method before anything is created, so the
          // host sees what they are about to be charged and on what — rather than
          // being handed straight to a provider's page they never chose.
          if (price > 0) {
            setPayOpen(true);
            return;
          }
          handleCreate();
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
      {/* The wizard's back arrow steps through the form rather than the history, but
          the bar around it is the same one every other screen wears. */}
      <TopBar
        className="static bg-background"
        left={
          <IconButton
            type="button"
            onClick={() => {
              if (step <= 0) {
                navigate(-1);
                return;
              }
              setStep((s) => s - 1);
            }}
            aria-label={t("common.back")}
          >
            <ArrowLeftIcon size={18} />
          </IconButton>
        }
      />

      <div className="w-full flex flex-col items-center px-6 mt-6  shrink-0">
        <h1 className="font-serif text-3xl text-center max-w-[19rem]">
          {steps[step]?.title}
        </h1>
      </div>

      <div className="flex flex-col items-center justify-start flex-1 px-5 pb-6 overflow-y-auto">
        <p className="text-[0.95rem] mb-9 text-muted-foreground text-center leading-snug mt-4 whitespace-pre-line">
          {steps[step]?.description}
        </p>
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
              aria-label={t("create.goToStep", { number: index + 1 })}
              aria-current={step === index}
              onClick={() => {
                // Going back is always allowed; going forward has to clear the same
                // check the Next button applies.
                if (index > step) {
                  const problem = firstProblem([steps[step]], value);
                  if (problem) {
                    setAlert(problem);
                    return;
                  }
                }
                setStep(index);
              }}
              className={cn(
                "rounded-full size-1.5 transition-colors duration-200 cursor-pointer",
                step === index ? "bg-foreground" : "bg-surface-strong",
              )}
            />
          ))}
        </div>

        {error ? (
          <p className="absolute inset-x-5 -top-5 text-xs text-danger text-center">
            {error}
          </p>
        ) : null}

        <button
          className={cn(
            "absolute end-5 bottom-5 flex flex-row gap-2 items-center",
            "bg-foreground text-white rounded-2xl px-5 py-3 font-medium cursor-pointer",
            "transition-transform duration-200 active:scale-95",
            "disabled:opacity-45 disabled:pointer-events-none",
          )}
          type="submit"
          disabled={submitting || (onNameStep && !guestName.trim())}
        >
          {isLastStep
            ? submitting
              ? t("create.submitting")
              : t("create.submit")
            : t("common.next")}
          <ArrowRightIcon size={16} className="rtl:-scale-x-100" />
        </button>
      </div>

      <AlertDialog
        open={Boolean(alert)}
        onClose={() => setAlert(null)}
        title={alert?.title}
        message={alert?.message}
      />

      <PaymentSheet
        open={payOpen}
        setOpen={setPayOpen}
        price={price}
        busy={submitting}
        error={error}
        confirmLabelKey="pay.createAndPay"
        onConfirm={handleCreate}
      />

      {submitting ? (
        <LoadingScreen
          variant="overlay"
          message={t("create.creating")}
        />
      ) : null}
    </form>
  );
}
