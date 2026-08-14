import { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { InfinityIcon, CheckIcon, ImagesIcon, PlusIcon, MinusIcon } from "lucide-react";
import eventsService from "../../../services/events.service";
import attachmentsService from "../../../services/attachments.service";
import uploadFile from "../../../utils/upload.util";
import { useAuth } from "../../../contexts/Auth.context";
import { encodeId, decodeId } from "../../../utils/idCodec.util";

const ZOOM_BUTTON_CLASS =
  "p-2 bg-black/50 text-white rounded-full backdrop-blur-sm border border-white/20 active:scale-90 transition-transform flex items-center justify-center";

function touchDistance(touches) {
  const [a, b] = touches;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
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
  const pendingBlobRef = useRef(null);
  const pinchRef = useRef(null);

  const [image, setImage] = useState(null);
  const [numCameras, setNumCameras] = useState(0);
  const [facingMode, setFacingMode] = useState("environment");
  const [maxShots, setMaxShots] = useState(undefined);
  const [takenCount, setTakenCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [lastShotSrc, setLastShotSrc] = useState(null);
  const [zoomCaps, setZoomCaps] = useState(null);
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    if (!authLoading) load();
  }, [eventId, authLoading]);

  async function load() {
    const eventResponse = await eventsService.getSingle(eventId);
    if (eventResponse.ok) {
      setMaxShots(eventResponse.data.maxAttachmentsPerUser);
    }

    const attachmentsResponse = await attachmentsService.getMultiple({
      eventId,
      userId: user.id,
    });
    if (attachmentsResponse.ok) {
      setTakenCount(attachmentsResponse.data.length);
      const latest = attachmentsResponse.data.reduce(
        (max, a) => (!max || a.id > max.id ? a : max),
        null,
      );
      if (latest) setLastShotSrc(attachmentsService.getDownloadSrc(latest));
    }
  }

  const shotsRemaining =
    maxShots == null ? Infinity : Math.max(0, maxShots - takenCount);

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
          setNumCameras(
            devices.filter((d) => d.kind === "videoinput").length,
          );
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

  const handleCapture = useCallback(async () => {
    if (shotsRemaining <= 0 || !trackRef.current) return;

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
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.95),
      );
    }

    if (!blob) return;

    pendingBlobRef.current = blob;
    setImage(URL.createObjectURL(blob));
  }, [shotsRemaining]);

  const handleRetake = useCallback(() => {
    if (image) URL.revokeObjectURL(image);
    setImage(null);
    pendingBlobRef.current = null;
  }, [image]);

  async function handleUsePhoto() {
    if (!image || !pendingBlobRef.current) return;
    setSaving(true);

    const blob = pendingBlobRef.current;
    const storageKey = await uploadFile(blob, blob.type || "image/jpeg", {
      eventId,
      type: "PICTURE",
    });

    const response = await attachmentsService.create({
      storageKey,
      type: "PICTURE",
      eventId,
    });

    setSaving(false);
    URL.revokeObjectURL(image);
    setImage(null);
    pendingBlobRef.current = null;

    if (response.ok) {
      setTakenCount((c) => c + 1);
      setLastShotSrc(attachmentsService.getDownloadSrc(response.data));
      if (
        maxShots != null &&
        Math.max(0, maxShots - (takenCount + 1)) <= 0
      ) {
        navigate(`/events/${encodeId(eventId)}`);
      }
    }
  }

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

  return (
    <div className="w-screen h-dvh absolute top-0 left-0 bg-black overflow-hidden">
      {/* Camera viewfinder */}
      {!image && !cameraError && (
        <div
          className="w-full h-full absolute top-0 left-0"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
          />
        </div>
      )}

      {!image && cameraError && (
        <div className="w-full h-full flex items-center justify-center px-10 text-center text-white text-sm">
          {cameraError}
        </div>
      )}

      {/* Shots remaining badge */}
      {!image && (
        <div className="absolute top-4 left-4 z-10 bg-black/50 text-white text-sm rounded-full px-3 py-1 backdrop-blur-sm flex flex-row items-center gap-1">
          {shotsRemaining === Infinity ? (
            <InfinityIcon size={14} />
          ) : (
            shotsRemaining
          )}{" "}
          shots left
        </div>
      )}

      {/* Zoom controls */}
      {!image && zoomCaps && (
        <div className="absolute right-4 bottom-40 z-10 flex flex-col items-center gap-2">
          <button
            onClick={() => applyZoom((zoom ?? zoomCaps.min) + zoomCaps.step)}
            className={ZOOM_BUTTON_CLASS}
            aria-label="Zoom in"
          >
            <PlusIcon size={18} />
          </button>
          <button
            onClick={() => applyZoom((zoom ?? zoomCaps.min) - zoomCaps.step)}
            className={ZOOM_BUTTON_CLASS}
            aria-label="Zoom out"
          >
            <MinusIcon size={18} />
          </button>
        </div>
      )}

      {/* Bottom controls */}
      {!image && (
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent z-10 flex items-center justify-evenly pb-8">
          {/* Gallery / back to event (left) */}
          <div className="w-16 flex justify-center">
            <button
              onClick={() => navigate(`/events/${encodeId(eventId)}`)}
              className="size-12 rounded-full overflow-hidden bg-black/50 text-white backdrop-blur-sm border border-white/20 active:scale-90 transition-transform flex items-center justify-center"
              aria-label="Back to event"
            >
              {lastShotSrc ? (
                <img
                  src={lastShotSrc}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImagesIcon size={20} />
              )}
            </button>
          </div>

          {/* Shutter button (center) */}
          {shotsRemaining <= 0 ? (
            <span className="text-white text-sm bg-black/50 rounded-full px-4 py-2 backdrop-blur-sm">
              All shots used
            </span>
          ) : (
            <button
              onClick={handleCapture}
              className="w-20 h-20 bg-white rounded-full active:scale-90 transition-transform duration-75 ease-out shadow-[0_0_0_4px_rgba(255,255,255,0.3)]"
              aria-label="Take Photo"
            />
          )}

          {/* Flip camera (right) */}
          <div className="w-16 flex justify-center">
            {numCameras > 1 && (
              <button
                onClick={handleFlip}
                className="p-3 bg-black/50 text-white rounded-full backdrop-blur-sm border border-white/20 active:scale-90 transition-transform flex items-center justify-center"
                aria-label="Flip Camera"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="1 4 1 10 7 10" />
                  <polyline points="23 20 23 14 17 14" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Image preview overlay */}
      {image && (
        <>
          <img
            src={image}
            alt="Captured"
            className="w-full h-full absolute top-0 left-0 object-cover z-20"
          />

          {/* Preview bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent z-30 flex items-center justify-evenly pb-8">
            <button
              onClick={handleRetake}
              disabled={saving}
              className="px-8 py-3 bg-white/20 backdrop-blur-md text-white rounded-full text-sm font-bold border border-white/30 active:scale-90 transition-transform disabled:opacity-50"
            >
              Retake
            </button>
            <button
              onClick={handleUsePhoto}
              disabled={saving}
              className="p-4 bg-white text-black rounded-full active:scale-90 transition-transform disabled:opacity-50 flex items-center justify-center"
              aria-label="Use Photo"
            >
              <CheckIcon size={22} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
