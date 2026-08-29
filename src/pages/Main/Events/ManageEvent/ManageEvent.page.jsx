import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import {
  ArrowLeftIcon,
  CameraIcon,
  ClockIcon,
  DownloadIcon,
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
import { useAuth } from "../../../../contexts/Auth.context";
import useTicker from "../../../../hooks/useTicker.hook";
import { formatCountdown } from "../../../../utils/countdown.util";
import { getCoverSrc } from "../../../../utils/cover.util";
import { encodeId, decodeId } from "../../../../utils/idCodec.util";
import InviteSheet from "./components/InviteSheet.component";
import ShareSheet from "./components/ShareSheet.component";
import SettingsSheet from "./components/SettingsSheet.component";

export default function ManageEventPage() {
  const { eventId: encodedEventId } = useParams();
  const eventId = decodeId(encodedEventId);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  // So the Camera button closes itself the moment the event finishes.
  const now = useTicker();

  // Coming back from the camera, the previous payload is still in hand — paint it now
  // and let load() refresh underneath rather than blanking the screen.
  const [event, setEvent] = useState(() => eventsService.getCached(eventId));
  const [loading, setLoading] = useState(!event);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);

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
    const response = await eventsService.getSingle(eventId);

    if (response.status === 403) {
      navigate(`/events/invitation/${encodeId(eventId)}`, { replace: true });
      return;
    }

    setEvent(response.ok ? response.data : null);
    setLoading(false);
  }

  async function handleCheckoutRetry() {
    const response = await eventsService.checkout(eventId);
    if (response.ok && response.data.checkoutUrl) {
      window.location.href = response.data.checkoutUrl;
    } else {
      load();
    }
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
    return <LoadingScreen message="Developing your photos…" />;
  }

  if (!event) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className="font-serif text-3xl">Nothing here</h1>
        <p className="text-sm text-muted-foreground">
          This event doesn't exist or was deleted.
        </p>
        <Link to="/events">
          <Button variant="primary">Back to events</Button>
        </Link>
      </div>
    );
  }

  if (isCreator && !event.paidAt) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className="font-serif text-3xl">Almost there</h1>
        <p className="text-sm text-muted-foreground">
          Complete payment to activate "{event.name}".
        </p>
        <Button variant="primary" onClick={handleCheckoutRetry}>
          Complete payment
        </Button>
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
    { value: attachments.length, label: "Moments" },
    { value: ended ? "Ended" : "Live", label: "Status" },
    { value: peopleCount, label: "People" },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-background pb-12">
      <TopBar
        left={
          <IconButton
            onClick={() => navigate("/events")}
            aria-label="Back to events"
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
              Settings
            </Button>
          ) : null
        }
      />

      {/* Cover hero. The title and stats sit on the photo itself, so they keep the
          reference's white-on-image treatment even in the light theme. */}
      <div
        className="relative w-full min-h-[24rem] bg-surface-strong bg-cover bg-center shrink-0"
        style={{ backgroundImage: `url(${coverSrc})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/25" />

        <div className="absolute inset-x-0 bottom-0 px-5 pt-16 pb-6 flex flex-col items-center text-center text-white">
          <h1 className="font-serif text-4xl">{event.name}</h1>

          <div className="flex flex-row items-start justify-between w-full max-w-sm mt-5">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center flex-1"
              >
                <span className="font-serif italic text-2xl">{stat.value}</span>
                <span className="text-xs mt-0.5 text-white/75">
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
            {formatCountdown(event.endAt) || "Ended"}
          </span>
          <span className="flex flex-row items-center gap-1.5">
            <UserRoundIcon size={14} />
            {peopleCount} joined
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
                Share event
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setInviteOpen(true)}
                className="justify-center"
              >
                <QrCodeIcon size={16} />
                Invite
              </Button>
            ))}

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
              Event ended
            </Button>
          ) : (
            <Link to={`/events/${encodeId(eventId)}/camera`} className="flex-1">
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-center"
              >
                <CameraIcon size={16} />
                Camera
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
            Reveals on{" "}
            {event.revealAt
              ? new Date(event.revealAt).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "soon"}
          </span>
        </div>
      ) : null}

      {attachments.length === 0 ? (
        <p className="text-sm text-subtle text-center mt-12">
          No moments captured yet.
        </p>
      ) : (
        <PhotoGrid
          attachments={attachments}
          currentUserId={user.id}
          onOpen={setViewerIndex}
          className="px-4 mt-5"
        />
      )}

      <InviteSheet open={inviteOpen} setOpen={setInviteOpen} event={event} />
      <ShareSheet open={shareOpen} setOpen={setShareOpen} event={event} />
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
          fileNamePrefix={event.name || "moment"}
          canHide={isCreator}
          onToggleHidden={handleToggleHidden}
        />
      ) : null}
    </div>
  );
}
