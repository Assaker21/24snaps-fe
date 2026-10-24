import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import {
  ArrowLeftIcon,
  CameraIcon,
  ClockIcon,
  LayoutTemplateIcon,
  QrCodeIcon,
  Share2Icon,
  SettingsIcon,
  UserRoundIcon,
} from "lucide-react";
import eventsService from "../../../../services/events.service";
import attachmentsService from "../../../../services/attachments.service";
import Button from "../../../../components/Button.component";
import IconButton from "../../../../components/IconButton.component";
import LoadingScreen from "../../../../components/LoadingScreen.component";
import PhotoGrid from "../../../../components/PhotoGrid.component";
import PhotoViewer from "../../../../components/PhotoViewer.component";
import TopBar from "../../../../components/TopBar.component";
import PaymentSheet from "../../../../components/PaymentSheet.component";
import { useAuth } from "../../../../contexts/Auth.context";
import useTicker from "../../../../hooks/useTicker.hook";
import useUploadQueue from "../../../../hooks/useUploadQueue.hook";
import { useT } from "../../../../contexts/I18n.context";
import useFormat from "../../../../hooks/useFormat.hook";
import { getCoverSrc } from "../../../../utils/cover.util";
import cn from "../../../../utils/cn.util";
import { encodeId, tryDecodeId } from "../../../../utils/idCodec.util";
import InviteSheet from "./components/InviteSheet.component";
import ShareSheet from "./components/ShareSheet.component";
import SettingsSheet from "./components/SettingsSheet.component";
import TemplatesSheet from "./components/TemplatesSheet.component";
import useSeo from "../../../../hooks/useSeo.hook";

export default function ManageEventPage() {
  const { eventId: encodedEventId } = useParams();
  const eventId = tryDecodeId(encodedEventId);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const t = useT();
  const fmt = useFormat();
  // So the Camera button closes itself the moment the event finishes.
  const now = useTicker();

  // Coming back from the camera, the previous payload is still in hand — paint it now
  // and let load() refresh underneath rather than blanking the screen.
  const [event, setEvent] = useState(() => eventsService.getCached(eventId));
  const [loading, setLoading] = useState(!event);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);

  useSeo({ title: event?.name || t("event.pageTitle") });

  // Shots this browser is still uploading — a capture taken on the camera page, or one
  // resumed from a previous visit. They belong in the grid: the photo exists, it is
  // only the server that doesn't have it yet. Each landing refreshes the payload, which
  // is what swaps a pending tile for the real attachment.
  const { items: pendingUploads } = useUploadQueue({
    eventId,
    onSuccess: () => {
      eventsService.invalidate(eventId);
      load();
    },
  });

  useEffect(() => {
    if (!authLoading) load();
  }, [eventId, authLoading]);

  // One request for the whole screen: the event payload already carries its
  // attachments, scoped and gated, with presigned URLs on each.
  //
  // The API only hands an event to the people in it, so a 403 here is not a failure —
  // it is the answer "you haven't joined yet", and the invitation page is where that
  // gets resolved.
  async function load() {
    // The URL didn't carry a readable event code — a truncated or mistyped link. There
    // is nothing to ask the API about, so go straight to the not-found state below.
    if (eventId == null) {
      setEvent(null);
      setLoading(false);
      return;
    }

    const response = await eventsService.getSingle(eventId);

    if (response.status === 403) {
      navigate(`/events/invitation/${encodeId(eventId)}`, { replace: true });
      return;
    }

    setEvent(response.ok ? response.data : null);
    setLoading(false);
  }

  // Starting the payment is one request: the server either hands back a hosted
  // checkout URL, or says the event is already paid for — which is the answer when a
  // previous attempt went through and its callback never arrived.
  async function handleCheckout() {
    setPaying(true);
    setPayError(null);

    const response = await eventsService.checkout(eventId);

    if (response.ok && response.data.checkoutUrl) {
      window.location.href = response.data.checkoutUrl;
      return;
    }

    setPaying(false);

    if (!response.ok) {
      setPayError(response.data?.message || t("pay.unreachable"));
      return;
    }

    // Paid, or free — either way there is nothing left to pay and the screen behind
    // this sheet is now wrong.
    setPayOpen(false);
    eventsService.invalidate(eventId);
    load();
  }

  const isCreator = event && user && event.creatorId === user.id;

  // Hiding takes a photo out of every other view, the uploader's included — so the
  // grid is re-read from the server rather than patched, and the host's copy comes
  // back carrying its "hidden" mark.
  async function handleToggleHidden(attachment) {
    const response = await attachmentsService.setHidden(
      attachment.id,
      !attachment.hidden,
    );
    if (!response.ok) return;

    eventsService.invalidate(eventId);
    await load();
  }

  if (authLoading || loading || !user) {
    return <LoadingScreen message={t("event.loading")} />;
  }

  if (!event) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className="font-serif text-3xl">{t("event.notFound.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("event.notFound.body")}
        </p>
        <Link to="/events">
          <Button variant="primary">{t("event.notFound.back")}</Button>
        </Link>
      </div>
    );
  }

  if (isCreator && !event.paidAt) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className="font-serif text-3xl">{t("pay.almostThere")}</h1>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          {t("pay.completeBody", { name: event.name })}
        </p>
        <Button variant="primary" onClick={() => setPayOpen(true)}>
          {t("pay.complete")}
        </Button>

        {payError && !payOpen ? (
          <p className="text-sm text-danger max-w-xs">{payError}</p>
        ) : null}

        <PaymentSheet
          open={payOpen}
          setOpen={(next) => {
            setPayOpen(next);
            if (!next) setPayError(null);
          }}
          price={event.price}
          busy={paying}
          error={payError}
          onConfirm={handleCheckout}
        />
      </div>
    );
  }

  const attachments = event.attachments ?? [];
  const revealed = event.revealAt && new Date(event.revealAt) <= new Date();
  // Always a photo: an event with no cover of its own falls back to the shipped
  // default rather than a grey box, so the hero keeps one treatment.
  const coverSrc = getCoverSrc(event);
  const ended = Boolean(event.endAt) && new Date(event.endAt).getTime() <= now;
  // Server-computed so the creator — who shoots too — is counted alongside the
  // participants relation they aren't part of.
  const peopleCount =
    event.peopleCount ?? (event.participants?.length ?? 0) + 1;

  const stats = [
    {
      value: attachments.length + pendingUploads.length,
      label: t("event.stats.moments"),
    },
    {
      value: ended ? t("countdown.ended") : t("event.status.live"),
      label: t("event.stats.status"),
    },
    { value: peopleCount, label: t("event.stats.people") },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-background pb-12">
      {/* Cover hero. The title and stats sit on the photo itself, so they keep the
          reference's white-on-image treatment even in the light theme.

          The bar is laid over this block rather than stacked above it, which is what
          lets the cover run all the way to the top of the screen. That costs the bar
          its own background — it is sitting on a photo now — so it carries a white
          scrim instead: opaque under the wordmark and the pills, fading out below
          them. Fixed rather than sticky, because a sticky bar still takes up a row in
          the flow and would push the cover back down. */}
      <div className="relative w-full min-h-[40rem] shrink-0">
        {/* Deliberately shorter than the block holding it. The title and stats are
            anchored to the bottom of the parent, so the extra height is what lets
            them finish on the page's own white instead of entirely over the photo —
            still overlapping it, just by less. */}
        <div
          className="absolute inset-x-0 top-0 h-[36rem] bg-surface-strong bg-cover bg-center"
          style={{ backgroundImage: `url(${coverSrc})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-white/100 via-white/10 to-white/0" />
        </div>

        <TopBar
          className={cn(
            "fixed inset-x-0 top-0 bg-transparent backdrop-blur-none",
            // The scrim has to outlast the row it protects, so the bar is padded
            // well past its contents and the gradient fades out inside that padding.
            "bg-gradient-to-b from-white/15 via-white/15 to-transparent pb-10",
            // That padding is also dead space lying over the page, and a fixed box
            // swallows clicks whether or not you can see it. Only the two real
            // clusters — the back button with the wordmark, and the pills — take the
            // pointer back.
            "pointer-events-none [&>*]:pointer-events-auto",
          )}
          left={
            <IconButton
              onClick={() => navigate("/events")}
              aria-label={t("event.backToEvents")}
            >
              <ArrowLeftIcon size={18} />
            </IconButton>
          }
          actions={
            isCreator ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSettingsOpen(true)}
              >
                <SettingsIcon size={16} />
                {t("event.settings")}
              </Button>
            ) : null
          }
        />

        <div className="absolute inset-x-0 bottom-0 px-5 pt-16 pb-5 flex flex-col items-center text-center text-black">
          <h1 className="font-serif text-4xl">{event.name}</h1>

          <div className="flex flex-row items-start justify-between w-full max-w-sm mt-5">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center flex-1"
              >
                <span className="font-serif italic text-2xl">{stat.value}</span>
                <span className="text-xs mt-0.5 text-black/75">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-5">
        <div className="flex flex-row items-center gap-4 text-sm text-muted-foreground">
          <span className="flex flex-row items-center gap-1.5">
            <ClockIcon size={14} />
            {fmt.countdown(event.endAt) || t("countdown.ended")}
          </span>
          <span className="flex flex-row items-center gap-1.5">
            <UserRoundIcon size={14} />
            {t("event.joinedCount", { count: peopleCount })}
          </span>
        </div>

        <div className="flex flex-row gap-2 mt-4">
          {/* Inviting and sharing answer opposite halves of the event's life, so they
              take the same slot rather than sitting side by side: while it runs the
              host is recruiting shooters, and once it is an album the only thing left
              to do with it is publish it. */}
          {isCreator &&
            (ended ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShareOpen(true)}
                className="justify-center"
              >
                <Share2Icon size={16} />
                {t("event.shareEvent")}
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setInviteOpen(true)}
                className="justify-center"
              >
                <QrCodeIcon size={16} />
                {t("event.invite")}
              </Button>
            ))}

          {/* Managing a template is the host's, and only while the event is still to
              come or still running — a finished album's card can be downloaded from
              here but not rewritten, which is what the sheet falls back to. */}
          {isCreator ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setTemplatesOpen(true)}
              className="justify-center"
            >
              <LayoutTemplateIcon size={16} />
              {t("event.templates")}
            </Button>
          ) : null}

          {/* An album is finished: the camera is closed for everyone, host included,
              and the server refuses shots past this point regardless. */}
          {ended ? (
            <Button
              variant="secondary"
              size="sm"
              disabled
              className="flex-1 justify-center"
            >
              <CameraIcon size={16} />
              {t("event.ended")}
            </Button>
          ) : (
            <Link to={`/events/${encodeId(eventId)}/camera`} className="flex-1">
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-center"
              >
                <CameraIcon size={16} />
                {t("event.camera")}
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="border-t border-border mx-4 mt-6" />

      {/* One banner for the whole grid rather than a pill per tile — the tiles
          themselves are already unrecoverably blurred server-side. */}
      {!revealed && attachments.length > 0 ? (
        <div className="flex justify-center mt-5">
          <span className="flex flex-row items-center gap-2 bg-surface text-muted-foreground text-xs rounded-full px-4 py-2 whitespace-nowrap">
            <ClockIcon size={13} />
            {t("event.revealsOn", {
              moment: event.revealAt
                ? fmt.moment(event.revealAt)
                : t("event.revealsSoon"),
            })}
          </span>
        </div>
      ) : null}

      {attachments.length === 0 && pendingUploads.length === 0 ? (
        <p className="text-sm text-subtle text-center mt-12">
          {t("event.noMoments")}
        </p>
      ) : (
        <PhotoGrid
          attachments={attachments}
          pending={pendingUploads}
          currentUserId={user.id}
          onOpen={setViewerIndex}
          className="px-4 mt-5"
        />
      )}

      <InviteSheet open={inviteOpen} setOpen={setInviteOpen} event={event} />
      <ShareSheet open={shareOpen} setOpen={setShareOpen} event={event} />
      <TemplatesSheet
        open={templatesOpen}
        setOpen={setTemplatesOpen}
        event={event}
        onUpdated={load}
      />
      <SettingsSheet
        open={settingsOpen}
        setOpen={setSettingsOpen}
        event={event}
        onUpdated={load}
      />

      {viewerIndex != null ? (
        <PhotoViewer
          attachments={attachments}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          currentUserId={user.id}
          fileNamePrefix={event.name || t("event.momentFileName")}
          canHide={isCreator}
          onToggleHidden={handleToggleHidden}
        />
      ) : null}
    </div>
  );
}
