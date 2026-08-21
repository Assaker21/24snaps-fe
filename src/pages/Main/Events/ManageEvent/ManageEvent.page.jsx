import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import {
  ArrowLeftIcon,
  CameraIcon,
  ClockIcon,
  DownloadIcon,
  QrCodeIcon,
  SettingsIcon,
  UserRoundIcon,
} from "lucide-react";
import eventsService from "../../../../services/events.service";
import attachmentsService from "../../../../services/attachments.service";
import Button from "../../../../components/Button.component";
import IconButton from "../../../../components/IconButton.component";
import PhotoGrid from "../../../../components/PhotoGrid.component";
import PhotoViewer from "../../../../components/PhotoViewer.component";
import { useAuth } from "../../../../contexts/Auth.context";
import { formatCountdown } from "../../../../utils/countdown.util";
import cn from "../../../../utils/cn.util";
import { encodeId, decodeId } from "../../../../utils/idCodec.util";
import InviteSheet from "./components/InviteSheet.component";
import SettingsSheet from "./components/SettingsSheet.component";

export default function ManageEventPage() {
  const { eventId: encodedEventId } = useParams();
  const eventId = decodeId(encodedEventId);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Coming back from the camera, the previous payload is still in hand — paint it now
  // and let load() refresh underneath rather than blanking the screen.
  const [event, setEvent] = useState(() => eventsService.getCached(eventId));
  const [loading, setLoading] = useState(!event);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);

  useEffect(() => {
    if (!authLoading) load();
  }, [eventId, authLoading]);

  // One request for the whole screen: the event payload already carries its
  // attachments, scoped and gated, with presigned URLs on each.
  async function load() {
    const response = await eventsService.getSingle(eventId);
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
  const isParticipant =
    event && user && event.participants?.some((p) => p.id === user.id);

  // Non-participants only ever land here via a shared link that predates the
  // dedicated invitation route — send them there instead of joining inline.
  useEffect(() => {
    if (event && user && !isCreator && !isParticipant) {
      navigate(`/events/invitation/${encodeId(eventId)}`, { replace: true });
    }
  }, [event, user, isCreator, isParticipant, eventId, navigate]);

  if (
    authLoading ||
    loading ||
    !user ||
    (event && !isCreator && !isParticipant)
  ) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className="font-serif text-3xl">Nothing here</h1>
        <p className="text-sm text-muted-foreground">
          This film doesn't exist or was deleted.
        </p>
        <Link to="/films">
          <Button variant="primary">Back to films</Button>
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
  const coverSrc = attachmentsService.getSrc(event.mainAttachment, "cover");
  const ended = event.endAt && new Date(event.endAt) <= new Date();
  // Server-computed so the creator — who shoots too — is counted alongside the
  // participants relation they aren't part of.
  const peopleCount = event.peopleCount ?? (event.participants?.length ?? 0) + 1;

  const stats = [
    { value: attachments.length, label: "Moments" },
    { value: ended ? "Ended" : "Live", label: "Status" },
    { value: peopleCount, label: "People" },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-background pb-12">
      {/* Cover hero. The title and stats sit on the photo itself, so they keep the
          reference's white-on-image treatment even in the light theme. */}
      <div
        className={cn(
          "relative w-full bg-surface-strong bg-cover bg-center shrink-0",
          coverSrc ? "min-h-[26rem]" : "min-h-[18rem]",
        )}
        style={coverSrc ? { backgroundImage: `url(${coverSrc})` } : undefined}
      >
        {coverSrc ? (
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/25" />
        ) : null}

        <div className="relative flex flex-row items-start justify-between p-4">
          <IconButton
            variant={coverSrc ? "overlay" : "surface"}
            onClick={() => navigate("/films")}
            aria-label="Back to films"
          >
            <ArrowLeftIcon size={18} />
          </IconButton>
          {isCreator && (
            <IconButton
              variant={coverSrc ? "overlay" : "surface"}
              onClick={() => setSettingsOpen(true)}
              aria-label="Film settings"
            >
              <SettingsIcon size={18} />
            </IconButton>
          )}
        </div>

        <div
          className={cn(
            "absolute inset-x-0 bottom-0 px-5 pb-6 flex flex-col items-center text-center",
            coverSrc ? "text-white" : "text-foreground",
          )}
        >
          <h1 className="font-serif text-4xl">{event.name}</h1>

          <div className="flex flex-row items-start justify-between w-full max-w-sm mt-5">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center flex-1">
                <span className="font-serif italic text-2xl">{stat.value}</span>
                <span
                  className={cn(
                    "text-xs mt-0.5",
                    coverSrc ? "text-white/75" : "text-muted-foreground",
                  )}
                >
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
          <Button
            variant="secondary"
            size="sm"
            disabled
            title="Coming soon"
            className="justify-center"
          >
            <DownloadIcon size={16} />
            Export
          </Button>
          {isCreator && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setInviteOpen(true)}
              className="justify-center"
            >
              <QrCodeIcon size={16} />
              Invite
            </Button>
          )}
          <Link to={`/events/${encodeId(eventId)}/camera`} className="flex-1">
            <Button variant="primary" size="sm" className="w-full justify-center">
              <CameraIcon size={16} />
              Camera
            </Button>
          </Link>
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
        />
      ) : null}
    </div>
  );
}
