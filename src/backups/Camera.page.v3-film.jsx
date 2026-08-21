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
import { useAuth } from "../../../contexts/Auth.context";
import { encodeId, decodeId } from "../../../utils/idCodec.util";
import { formatCountdown } from "../../../utils/countdown.util";
import IconButton from "../../../components/IconButton.component";
import cn from "../../../utils/cn.util";
import InviteSheet from "../Events/ManageEvent/components/InviteSheet.component";

function touchDistance(touches) {
  const [a, b] = touches;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

// The mechanical frame counter from the reference: the live number flanked by the
// two it sits between, clipped by the housing.
function FrameCounter({ remaining }) {
  if (remaining === Infinity) {
    return (
      <div className="w-24 h-14 rounded-2xl bg-foreground text-white flex items-center justify-center">
        <InfinityIcon size={22} />
      </div>
    );
  }

  return (
    <div className="w-24 h-14 rounded-2xl bg-foreground overflow-hidden flex flex-row items-center justify-center gap-2 font-serif italic text-white">
      <span className="text-lg text-white/35">{remaining + 1}</span>
      <span className="text-2xl">{remaining}</span>
      <span className="text-lg text-white/35">
        {Math.max(0, remaining - 1)}
      </span>
    </div>
  );
}

// Uploads run behind the viewfinder, so this strip is the only place they're visible.
// It occupies a fixed-height slot whether or not it has anything to say, so the deck
// below it never shifts under the user's thumb mid-burst.
function UploadStatus({ uploadingCount, failedCount, onRetry, onDismiss }) {
  return (
    <div className="h-8 flex items-center justify-center">
      {failedCount > 0 ? (
        <div className="flex flex-row items-center gap-2 rounded-full bg-danger-soft text-danger pl-3 pr-1.5 py-1 text-sm">
          <TriangleAlertIcon size={14} />
          <span>
            {failedCount} didn&apos;t upload
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-danger/10 px-2.5 py-0.5 font-medium cursor-pointer"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Discard failed uploads"
            className="px-1.5 py-0.5 text-danger/60 cursor-pointer"
          >
            &times;
          </button>
        </div>
      ) : uploadingCount > 0 ? (
        <div className="flex flex-row items-center gap-2 rounded-full bg-surface text-muted-foreground px-3 py-1 text-sm">
          <LoaderCircleIcon size={14} className="animate-spin" />
          <span>
            Uploading {uploadingCount}
            {uploadingCount === 1 ? " shot" : " shots"}…
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default function CameraPage() {
  const { eventId: encodedEventId } = useParams();
  const eventId = decodeId(encodedEventId);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

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
  const [event, setEvent] = useState(null);
  const [maxShots, setMaxShots] = useState(undefined);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [cameraError, setCameraError] = useState(null);
  const [lastShotSrc, setLastShotSrc] = useState(null);
  const [flash, setFlash] = useState(false);
  const [zoomCaps, setZoomCaps] = useState(null);
  const [zoom, setZoom] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Finished uploads leave the queue, so each success has to be folded into the local
  // count or the frame counter would tick back up as the queue drains.
  const {
    outstandingCount,
    uploadingCount,
    failedCount,
    enqueue,
    retryFailed,
    discardFailed,
  } = useUploadQueue({
    eventId,
    onSuccess: () => setUploadedCount((count) => count + 1),
  });

  useEffect(() => {
    return () => {
      if (localShotUrlRef.current) URL.revokeObjectURL(localShotUrlRef.current);
    };
  }, []);

  async function load() {
    const eventResponse = await eventsService.getSingle(eventId);
    if (eventResponse.ok) {
      setEvent(eventResponse.data);
      setMaxShots(eventResponse.data.maxAttachmentsPerUser);
    }

    const attachmentsResponse = await attachmentsService.getMultiple({
      eventId,
      userId: user.id,
    });
    if (attachmentsResponse.ok) {
      setUploadedCount(attachmentsResponse.data.length);
      const latest = attachmentsResponse.data.reduce(
        (max, a) => (!max || a.id > max.id ? a : max),
        null,
      );
      // A shot taken this session is already on screen from its own blob — don't
      // overwrite that with a server thumbnail that may not have been rendered yet.
      if (latest && !localShotUrlRef.current) {
        setLastShotSrc(attachmentsService.getSrc(latest, "thumb"));
      }
    }
  }

  useEffect(() => {
    if (!authLoading) load();
  }, [eventId, authLoading]);

  // Queued-but-unsent frames are spent film: counting them keeps a burst of shots from
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

      if (maxShots != null && shotsRemaining - 1 <= 0) {
        // The remaining uploads keep running from the module-level queue after this.
        navigate(`/events/${encodeId(eventId)}`);
      }
    } finally {
      capturingRef.current = false;
    }
  }, [shotsRemaining, maxShots, eventId, enqueue, navigate]);

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

  // The reference exposes zoom as 1x/2x stops rather than a slider. Track
  // capabilities report zoom in their own units, where `min` is the native 1x.
  const zoomStops = zoomCaps
    ? [
        { label: "1x", value: zoomCaps.min },
        { label: "2x", value: Math.min(zoomCaps.max, zoomCaps.min * 2) },
      ].filter((stop, index, all) => index === 0 || stop.value > all[0].value)
    : [];

  const isCreator = event && user && event.creatorId === user.id;

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      <div className="flex flex-row items-center justify-between gap-3 px-4 pt-4 shrink-0">
        <IconButton
          onClick={() => navigate(`/events/${encodeId(eventId)}`)}
          aria-label="Back to film"
        >
          <ArrowLeftIcon size={18} />
        </IconButton>

        <div className="flex flex-col items-center min-w-0 flex-1">
          <span className="font-serif text-2xl truncate max-w-full">
            {event?.name || " "}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatCountdown(event?.endAt)}
          </span>
        </div>

        {isCreator ? (
          <IconButton
            onClick={() => setInviteOpen(true)}
            aria-label="Invite guests"
          >
            <QrCodeIcon size={18} />
          </IconButton>
        ) : (
          <span className="size-11 shrink-0" />
        )}
      </div>

      {/* Viewfinder card. The dashed green rule under it is the reference's
          film-advance motif. */}
      <div className="px-4 mt-4 shrink-0">
        <div
          className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-foreground"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {cameraError ? (
            <div className="w-full h-full flex items-center justify-center px-8 text-center text-white/80 text-sm">
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

          {/* The shutter no longer freezes on a preview, so this blink is the only
              confirmation that the frame was taken. */}
          <div
            className="absolute inset-0 bg-white pointer-events-none transition-opacity duration-200 ease-out"
            style={{ opacity: flash ? 0.85 : 0 }}
          />
        </div>
        <div className="h-[3px] mt-1 mx-3 rounded-full bg-[repeating-linear-gradient(90deg,#10b981_0_6px,transparent_6px_12px)]" />
      </div>

      {/* Zoom stops + flip, mirroring the reference's row under the viewfinder. */}
      <div className="flex flex-row items-center justify-center relative px-6 mt-5 h-11 shrink-0">
          {zoomStops.length > 1 ? (
            <div className="flex flex-row items-center gap-1 bg-surface rounded-full p-1">
              {zoomStops.map((stop) => {
                const isActive =
                  Math.abs((zoom ?? zoomCaps.min) - stop.value) < 0.05;
                return (
                  <button
                    key={stop.label}
                    type="button"
                    onClick={() => applyZoom(stop.value)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-subtle",
                    )}
                  >
                    {stop.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {numCameras > 1 ? (
            <IconButton
              variant="ghost"
              onClick={handleFlip}
              aria-label="Flip camera"
              className="absolute right-6"
            >
              <RefreshCwIcon size={20} />
            </IconButton>
          ) : null}
      </div>

      {/* Bottom deck: upload status over counter, shutter and last shot. */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 pb-4 shrink-0">
        <UploadStatus
          uploadingCount={uploadingCount}
          failedCount={failedCount}
          onRetry={retryFailed}
          onDismiss={discardFailed}
        />

        <div className="w-full flex flex-row items-center justify-between gap-4">
          {/* Equal-width side slots keep the shutter optically centred even
              though the counter is wider than the thumbnail. */}
          <div className="w-24 flex justify-start">
            <FrameCounter remaining={shotsRemaining} />
          </div>

          {shotsRemaining <= 0 ? (
            <span className="text-sm text-muted-foreground bg-surface rounded-full px-4 py-2.5">
              All shots used
            </span>
          ) : (
            <button
              type="button"
              onClick={handleCapture}
              aria-label="Take photo"
              className={cn(
                "size-[4.5rem] shrink-0 rounded-full bg-surface border-[3px] border-foreground/20 cursor-pointer",
                "transition-[transform,background-color] duration-75 ease-out",
                "active:scale-90 active:bg-surface-strong",
              )}
            />
          )}

          <div className="w-24 flex justify-end">
            <button
              type="button"
              onClick={() => navigate(`/events/${encodeId(eventId)}`)}
              aria-label="Back to film"
              className="size-14 rounded-2xl overflow-hidden bg-surface text-subtle flex items-center justify-center cursor-pointer transition-transform active:scale-90"
            >
              {lastShotSrc ? (
                <img
                  src={lastShotSrc}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon size={22} />
              )}
            </button>
          </div>
        </div>
      </div>

      {event && isCreator ? (
        <InviteSheet open={inviteOpen} setOpen={setInviteOpen} event={event} />
      ) : null}
    </div>
  );
}
