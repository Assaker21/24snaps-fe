import { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeftIcon,
  ImageIcon,
  InfinityIcon,
  LoaderCircleIcon,
  QrCodeIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from "lucide-react";
import eventsService from "../../../services/events.service";
import attachmentsService from "../../../services/attachments.service";
import useUploadQueue from "../../../hooks/useUploadQueue.hook";
import useViewportHeight from "../../../hooks/useViewportHeight.hook";
import { useAuth } from "../../../contexts/Auth.context";
import { encodeId, decodeId } from "../../../utils/idCodec.util";
import { formatCountdown } from "../../../utils/countdown.util";
import cn from "../../../utils/cn.util";
import InviteSheet from "../Events/ManageEvent/components/InviteSheet.component";
import GallerySheet from "./components/GallerySheet.component";

function touchDistance(touches) {
  const [a, b] = touches;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

// The mechanical frame counter, kept from the previous design but reworked for the dark
// chrome: the live number flanked by the two it sits between.
function FrameCounter({ remaining }) {
  if (remaining === Infinity) {
    return (
      <div className="flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm text-white size-9">
        <InfinityIcon size={17} />
      </div>
    );
  }

  return (
    <div className="flex flex-row items-center justify-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3 h-9 font-serif italic text-white">
      <span className="text-xs text-white/40">{remaining + 1}</span>
      <span className="text-lg leading-none">{remaining}</span>
      <span className="text-xs text-white/40">{Math.max(0, remaining - 1)}</span>
    </div>
  );
}

// Uploads run behind the viewfinder, so this strip is the only place they're visible.
// It holds its height whether or not it has anything to say, so the deck below never
// shifts under the user's thumb mid-burst.
function UploadStatus({ uploadingCount, failedCount, onRetry, onDismiss }) {
  return (
    <div className="h-7 flex items-center justify-center">
      {failedCount > 0 ? (
        <div className="flex flex-row items-center gap-2 rounded-full bg-danger/85 text-white pl-3 pr-1.5 py-1 text-xs">
          <TriangleAlertIcon size={13} />
          <span>{failedCount} didn&apos;t upload</span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-white/25 px-2.5 py-0.5 font-medium cursor-pointer"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Discard failed uploads"
            className="px-1.5 py-0.5 text-white/70 cursor-pointer"
          >
            &times;
          </button>
        </div>
      ) : uploadingCount > 0 ? (
        <div className="flex flex-row items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm text-white/85 px-3 py-1 text-xs">
          <LoaderCircleIcon size={13} className="animate-spin" />
          <span>
            Uploading {uploadingCount}
            {uploadingCount === 1 ? " shot" : " shots"}…
          </span>
        </div>
      ) : null}
    </div>
  );
}

// The rounded-square glyph buttons that sit on the translucent bars.
function BarButton({ children, className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "size-10 shrink-0 rounded-full flex items-center justify-center cursor-pointer",
        "bg-white/15 backdrop-blur-sm text-white",
        "transition-transform duration-150 active:scale-90",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default function CameraPage() {
  const { eventId: encodedEventId } = useParams();
  const eventId = decodeId(encodedEventId);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const viewportHeight = useViewportHeight();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const imageCaptureRef = useRef(null);
  const pinchRef = useRef(null);
  const capturingRef = useRef(false);
  // Only the locally-captured preview URL is ours to revoke; a src that came back from
  // the server on load is just a URL.
  const localShotUrlRef = useRef(null);

  const [numCameras, setNumCameras] = useState(0);
  const [facingMode, setFacingMode] = useState("environment");
  // Seeded from the last payload so the header and frame counter are right from the
  // first frame — the camera must never make you wait on a request.
  const [event, setEvent] = useState(() => eventsService.getCached(eventId));
  const [uploadedCount, setUploadedCount] = useState(
    () =>
      (eventsService.getCached(eventId)?.attachments || []).filter(
        (a) => a.userId === user?.id,
      ).length,
  );
  const [cameraError, setCameraError] = useState(null);
  const [lastShotSrc, setLastShotSrc] = useState(null);
  const [flash, setFlash] = useState(false);
  const [zoomCaps, setZoomCaps] = useState(null);
  const [zoom, setZoom] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  // Finished uploads leave the queue, so each success has to be folded into the local
  // count or the frame counter would tick back up as the queue drains. The new row goes
  // straight into the roll as well, so the gallery is current without a refetch.
  const {
    outstandingCount,
    uploadingCount,
    failedCount,
    enqueue,
    retryFailed,
    discardFailed,
  } = useUploadQueue({
    eventId,
    onSuccess: ({ attachment }) => {
      setUploadedCount((count) => count + 1);
      if (!attachment) return;

      const prepend = (e) =>
        e ? { ...e, attachments: [attachment, ...(e.attachments || [])] } : e;

      setEvent(prepend);
      // Keep the shared copy in step too, so stepping back to the event screen shows
      // the shot straight away rather than a payload that predates it.
      eventsService.setCached(eventId, prepend(eventsService.getCached(eventId)));
    },
  });

  useEffect(() => {
    return () => {
      if (localShotUrlRef.current) URL.revokeObjectURL(localShotUrlRef.current);
    };
  }, []);

  // One request: the event payload already carries its attachments with presigned URLs,
  // which covers the shot counter, the last-shot thumbnail and the gallery alike.
  async function load() {
    const response = await eventsService.getSingle(eventId);
    if (!response.ok) return;

    setEvent(response.data);

    const mine = (response.data.attachments || []).filter(
      (a) => a.userId === user.id,
    );
    setUploadedCount(mine.length);

    // A shot taken this session is already on screen from its own blob — don't
    // overwrite that with a server thumbnail that may not have been fetched yet.
    if (mine.length && !localShotUrlRef.current) {
      setLastShotSrc(attachmentsService.getSrc(mine[0], "thumb"));
    }
  }

  useEffect(() => {
    if (!authLoading) load();
  }, [eventId, authLoading]);

  const maxShots = event?.maxAttachmentsPerUser;

  // Queued-but-unsent frames are spent shots: counting them keeps a burst from
  // overrunning the event's limit while their uploads are still catching up.
  const shotsRemaining =
    maxShots == null
      ? Infinity
      : Math.max(0, maxShots - uploadedCount - outstandingCount);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    trackRef.current = null;
    imageCaptureRef.current = null;
  }

  // Own the camera stream directly (rather than through a wrapper library) so we can
  // request full sensor resolution and reach the raw MediaStreamTrack for ImageCapture
  // (full-quality stills) and zoom constraints — neither is reachable through
  // react-camera-pro's public API.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 4096 },
            height: { ideal: 2160 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        if (videoRef.current) videoRef.current.srcObject = stream;

        imageCaptureRef.current =
          "ImageCapture" in window ? new window.ImageCapture(track) : null;

        const capabilities = track.getCapabilities?.();
        if (capabilities?.zoom) {
          const { min, max, step } = capabilities.zoom;
          setZoomCaps({ min, max, step: step || (max - min) / 10 || 1 });
          setZoom(track.getSettings?.().zoom ?? min);
        } else {
          setZoomCaps(null);
          setZoom(null);
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) {
          setNumCameras(devices.filter((d) => d.kind === "videoinput").length);
        }
        setCameraError(null);
      } catch (err) {
        if (!cancelled) {
          setCameraError(
            err?.name === "NotAllowedError"
              ? "Permission denied. Please refresh and give camera permission."
              : "No camera device accessible. Please connect your camera or try a different browser.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [facingMode]);

  const handleFlip = useCallback(() => {
    setFacingMode((m) => (m === "environment" ? "user" : "environment"));
  }, []);

  // The shutter is fire-and-forget: it grabs the frame, hands it to the background
  // queue, and gives the viewfinder straight back. Nothing here awaits the network, so
  // the next shot is available as soon as the sensor is.
  const handleCapture = useCallback(async () => {
    // `shotsRemaining` is a render-time value, so a fast double-tap could read a stale
    // one — this ref closes that window for the duration of the grab.
    if (capturingRef.current || shotsRemaining <= 0 || !trackRef.current) return;
    capturingRef.current = true;

    setFlash(true);
    setTimeout(() => setFlash(false), 90);

    try {
      let blob = null;
      if (imageCaptureRef.current) {
        try {
          blob = await imageCaptureRef.current.takePhoto();
        } catch {
          blob = null;
        }
      }

      if (!blob) {
        const video = videoRef.current;
        if (!video) return;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        canvas
          .getContext("2d")
          .drawImage(video, 0, 0, canvas.width, canvas.height);
        blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.95),
        );
      }

      if (!blob) return;

      enqueue({ blob, contentType: blob.type || "image/jpeg", type: "PICTURE" });

      // Show the shot we actually hold rather than waiting for the server's thumbnail.
      const previewUrl = URL.createObjectURL(blob);
      if (localShotUrlRef.current) URL.revokeObjectURL(localShotUrlRef.current);
      localShotUrlRef.current = previewUrl;
      setLastShotSrc(previewUrl);
    } finally {
      capturingRef.current = false;
    }
  }, [shotsRemaining, enqueue]);

  function applyZoom(nextZoom) {
    if (!trackRef.current || !zoomCaps) return;
    const clamped = Math.min(zoomCaps.max, Math.max(zoomCaps.min, nextZoom));
    trackRef.current
      .applyConstraints({ advanced: [{ zoom: clamped }] })
      .catch(() => {});
    setZoom(clamped);
  }

  function handleTouchStart(e) {
    if (e.touches.length === 2 && zoomCaps) {
      pinchRef.current = {
        startDist: touchDistance(e.touches),
        startZoom: zoom ?? zoomCaps.min,
      };
    }
  }

  function handleTouchMove(e) {
    if (e.touches.length === 2 && pinchRef.current) {
      const ratio = touchDistance(e.touches) / pinchRef.current.startDist;
      applyZoom(pinchRef.current.startZoom * ratio);
    }
  }

  function handleTouchEnd() {
    pinchRef.current = null;
  }

  // Zoom is exposed as 1x/2x stops rather than a slider. Track capabilities report zoom
  // in their own units, where `min` is the native 1x.
  const zoomStops = zoomCaps
    ? [
        { label: "1x", value: zoomCaps.min },
        { label: "2x", value: Math.min(zoomCaps.max, zoomCaps.min * 2) },
      ].filter((stop, index, all) => index === 0 || stop.value > all[0].value)
    : [];

  const isCreator = event && user && event.creatorId === user.id;
  const attachments = event?.attachments ?? [];

  return (
    <div
      // h-dvh covers the first paint; the measured visual-viewport height then takes
      // over, because on iOS Chrome dvh can still leave the bottom bar off screen.
      className="relative w-full h-dvh overflow-hidden bg-black select-none"
      style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}
    >
      {/* Full-bleed feed. Everything else floats over it. */}
      <div
        className="absolute inset-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {cameraError ? (
          <div className="w-full h-full flex items-center justify-center px-10 text-center text-white/75 text-sm">
            {cameraError}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{
              transform: facingMode === "user" ? "scaleX(-1)" : "none",
            }}
          />
        )}
      </div>

      {/* The shutter no longer freezes on a preview, so this blink is the only
          confirmation that the frame was taken. */}
      <div
        className="absolute inset-0 bg-white pointer-events-none transition-opacity duration-200 ease-out"
        style={{ opacity: flash ? 0.85 : 0 }}
      />

      {/* Top bar: back, the event's name and countdown, invite. */}
      <div className="absolute top-0 inset-x-0 bg-black/45 backdrop-blur-md px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex flex-row items-center justify-between gap-3">
        <BarButton
          onClick={() => navigate(`/events/${encodeId(eventId)}`)}
          aria-label="Back to event"
        >
          <ArrowLeftIcon size={18} />
        </BarButton>

        <div className="flex flex-col items-center min-w-0 flex-1 text-white">
          <span className="font-serif text-xl truncate max-w-full leading-tight">
            {event?.name || " "}
          </span>
          <span className="text-xs text-white/65">
            {formatCountdown(event?.endAt)}
          </span>
        </div>

        {isCreator ? (
          <BarButton
            onClick={() => setInviteOpen(true)}
            aria-label="Invite guests"
          >
            <QrCodeIcon size={18} />
          </BarButton>
        ) : (
          <span className="size-10 shrink-0" />
        )}
      </div>

      {/* Bottom bar: upload status, then the counter/zoom row, then the deck. */}
      <div className="absolute bottom-0 inset-x-0 bg-black/45 backdrop-blur-md px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-3">
        <UploadStatus
          uploadingCount={uploadingCount}
          failedCount={failedCount}
          onRetry={retryFailed}
          onDismiss={discardFailed}
        />

        <div className="relative flex flex-row items-center justify-center h-9">
          <div className="absolute left-0">
            <FrameCounter remaining={shotsRemaining} />
          </div>

          {zoomStops.length > 1 ? (
            <div className="flex flex-row items-center gap-1 bg-white/15 backdrop-blur-sm rounded-full p-1">
              {zoomStops.map((stop) => {
                const isActive =
                  Math.abs((zoom ?? zoomCaps.min) - stop.value) < 0.05;
                return (
                  <button
                    key={stop.label}
                    type="button"
                    onClick={() => applyZoom(stop.value)}
                    className={cn(
                      "px-3.5 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors",
                      isActive ? "bg-white text-black" : "text-white/80",
                    )}
                  >
                    {stop.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Apple's triad: roll on the left, shutter centred, flip on the right. */}
        <div className="flex flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            aria-label="Open gallery"
            className="size-12 shrink-0 rounded-xl overflow-hidden bg-white/15 text-white/70 flex items-center justify-center cursor-pointer transition-transform active:scale-90"
          >
            {lastShotSrc ? (
              <img
                src={lastShotSrc}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon size={20} />
            )}
          </button>

          {shotsRemaining <= 0 ? (
            <span className="text-xs text-white/80 bg-white/15 rounded-full px-4 py-2.5">
              All shots used
            </span>
          ) : (
            <button
              type="button"
              onClick={handleCapture}
              aria-label="Take photo"
              className={cn(
                "size-[4.25rem] shrink-0 rounded-full cursor-pointer",
                "bg-white ring-[3px] ring-inset ring-black/15",
                "border-[3px] border-white/45 bg-clip-padding",
                "transition-[transform,opacity] duration-75 ease-out",
                "active:scale-90 active:opacity-70",
              )}
            />
          )}

          {numCameras > 1 ? (
            <BarButton
              onClick={handleFlip}
              aria-label="Flip camera"
              className="size-12"
            >
              <RefreshCwIcon size={19} />
            </BarButton>
          ) : (
            <span className="size-12 shrink-0" />
          )}
        </div>
      </div>

      <GallerySheet
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        event={event}
        attachments={attachments}
        currentUserId={user?.id}
      />

      {event && isCreator ? (
        <InviteSheet open={inviteOpen} setOpen={setInviteOpen} event={event} />
      ) : null}
    </div>
  );
}
