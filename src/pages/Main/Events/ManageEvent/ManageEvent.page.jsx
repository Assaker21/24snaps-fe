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
  XIcon,
} from "lucide-react";
import eventsService from "../../../../services/events.service";
import attachmentsService from "../../../../services/attachments.service";
import Button from "../../../../components/Button.component";
import IconButton from "../../../../components/IconButton.component";
import { useAuth } from "../../../../contexts/Auth.context";
import { formatCountdown } from "../../../../utils/countdown.util";
import cn from "../../../../utils/cn.util";
import { encodeId, decodeId } from "../../../../utils/idCodec.util";
import InviteSheet from "./components/InviteSheet.component";
import SettingsSheet from "./components/SettingsSheet.component";

function extensionFromContentType(contentType) {
  return (contentType?.split("/")[1] || "jpg").split("+")[0];
}

export default function ManageEventPage() {
  const { eventId: encodedEventId } = useParams();
  const eventId = decodeId(encodedEventId);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState(null);
  // The viewer opens on the (already cached) thumb and upgrades to full size once
  // that finishes loading — see the preloader below.
  const [viewerSrc, setViewerSrc] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const viewerFullSrc = viewerAttachment
    ? attachmentsService.getSrc(viewerAttachment, "full")
    : null;

  function openViewer(attachment) {
    setViewerAttachment(attachment);
    setViewerSrc(attachmentsService.getSrc(attachment, "thumb"));
  }

  function closeViewer() {
    setViewerAttachment(null);
    setViewerSrc(null);
  }

  useEffect(() => {
    if (!authLoading) load();
  }, [eventId, authLoading]);

  async function load() {
    setLoading(true);
    const response = await eventsService.getSingle(eventId);
    if (response.ok) {
      setEvent(response.data);
      const attachmentsResponse = await attachmentsService.getMultiple({
        eventId,
      });
      if (attachmentsResponse.ok) setAttachments(attachmentsResponse.data);
    } else {
      setEvent(null);
    }
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

  async function handleDownload(attachment) {
    // Downloads always take the full size: the untouched original on paid events,
    // the lightly compressed version otherwise.
    const src = attachmentsService.getSrc(attachment, "full");
    if (!src) return;

    setDownloading(true);
    try {
      const blob = await fetch(src).then((r) => r.blob());
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${event?.name || "moment"}-${attachment.id}.${extensionFromContentType(blob.type)}`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // CORS/network hiccup fetching the blob — fall back to a plain navigation
      // so the user can still save the image manually.
      window.open(src, "_blank");
    } finally {
      setDownloading(false);
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

  const revealed = event.revealAt && new Date(event.revealAt) <= new Date();
  const coverSrc = attachmentsService.getSrc(event.mainAttachment, "cover");
  const ended = event.endAt && new Date(event.endAt) <= new Date();

  const stats = [
    { value: attachments.length, label: "Moments" },
    { value: ended ? "Ended" : "Live", label: "Status" },
    { value: event.participants?.length ?? 0, label: "People" },
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
            {event.participants?.length ?? 0} joined
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
        <div className="grid grid-cols-2 gap-2.5 px-4 mt-5">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative aspect-square rounded-2xl overflow-hidden bg-surface"
            >
              <button
                type="button"
                onClick={() => revealed && openViewer(attachment)}
                disabled={!revealed}
                className={cn(
                  "w-full h-full block",
                  revealed && "cursor-pointer",
                )}
              >
                <img
                  src={attachmentsService.getSrc(
                    attachment,
                    revealed ? "thumb" : "blur",
                  )}
                  alt=""
                  className={cn(
                    "w-full h-full object-cover",
                    // No CSS blur before reveal — the bytes themselves are blurred
                    // server-side now. scale-110 just hides the soft edges.
                    !revealed && "scale-110",
                  )}
                />
              </button>

              {revealed ? (
                <span className="absolute bottom-2.5 left-3 font-serif italic text-white text-lg drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] pointer-events-none">
                  {attachment.userId === user.id
                    ? "You"
                    : attachment.user?.firstName || ""}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <InviteSheet open={inviteOpen} setOpen={setInviteOpen} event={event} />
      <SettingsSheet
        open={settingsOpen}
        setOpen={setSettingsOpen}
        event={event}
        onUpdated={load}
      />

      {viewerAttachment && (
        <div className="fixed inset-0 z-260 bg-black/92 flex flex-col items-center justify-center p-4 gap-6">
          <IconButton
            variant="overlay"
            onClick={closeViewer}
            className="absolute top-4 right-4"
            aria-label="Close"
          >
            <XIcon size={20} />
          </IconButton>
          <img
            src={viewerSrc}
            alt=""
            className="max-w-full max-h-[75vh] object-contain rounded-2xl"
          />
          {/* Preloads the full size off-screen; the visible <img> swaps to it only
              once it has decoded, so the thumb shows instantly with no flash. */}
          {viewerFullSrc && viewerFullSrc !== viewerSrc && (
            <img
              src={viewerFullSrc}
              alt=""
              aria-hidden
              className="hidden"
              onLoad={() => setViewerSrc(viewerFullSrc)}
            />
          )}
          <Button
            variant="primary"
            onClick={() => handleDownload(viewerAttachment)}
            disabled={downloading}
            className="bg-white text-foreground"
          >
            <DownloadIcon size={16} />
            {downloading ? "Downloading…" : "Download"}
          </Button>
        </div>
      )}
    </div>
  );
}
