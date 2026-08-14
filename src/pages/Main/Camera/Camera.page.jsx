import { useRef, useState, useCallback, useEffect } from "react";
import { Camera } from "react-camera-pro";
import { useNavigate, useParams } from "react-router";
import { InfinityIcon, CheckIcon } from "lucide-react";
import eventsService from "../../../services/events.service";
import attachmentsService from "../../../services/attachments.service";
import uploadFile from "../../../utils/upload.util";
import { useAuth } from "../../../contexts/Auth.context";

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(",");
  const contentType = header.match(/data:(.*);base64/)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { blob: new Blob([bytes], { type: contentType }), contentType };
}

export default function CameraPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const camera = useRef(null);
  const [image, setImage] = useState(null);
  const [numCameras, setNumCameras] = useState(0);
  const [facingMode, setFacingMode] = useState("environment");
  const [maxShots, setMaxShots] = useState(undefined);
  const [takenCount, setTakenCount] = useState(0);
  const [saving, setSaving] = useState(false);

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
    }
  }

  const shotsRemaining =
    maxShots == null ? Infinity : Math.max(0, maxShots - takenCount);

  const handleNumberOfCameras = useCallback((count) => {
    setNumCameras(count);
  }, []);

  const handleCapture = useCallback(() => {
    if (!camera.current || shotsRemaining <= 0) return;
    const photo = camera.current.takePhoto();
    setImage(photo);
  }, [shotsRemaining]);

  const handleFlip = useCallback(() => {
    if (!camera.current) return;
    const nextMode = camera.current.switchCamera();
    setFacingMode(nextMode);
  }, []);

  const handleRetake = useCallback(() => {
    setImage(null);
  }, []);

  async function handleUsePhoto() {
    if (!image) return;
    setSaving(true);

    const { blob, contentType } = dataUrlToBlob(image);
    const storageKey = await uploadFile(blob, contentType, {
      eventId: Number(eventId),
      type: "PICTURE",
    });

    const response = await attachmentsService.create({
      storageKey,
      type: "PICTURE",
      eventId: Number(eventId),
    });

    setSaving(false);
    setImage(null);

    if (response.ok) {
      setTakenCount((c) => c + 1);
      if (
        maxShots != null &&
        Math.max(0, maxShots - (takenCount + 1)) <= 0
      ) {
        navigate(`/events/${eventId}`);
      }
    }
  }

  return (
    <div className="w-screen h-dvh absolute top-0 left-0 bg-black overflow-hidden">
      {/* Camera viewfinder */}
      {!image && (
        <Camera
          ref={camera}
          facingMode={facingMode}
          numberOfCamerasCallback={handleNumberOfCameras}
        />
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

      {/* Bottom controls */}
      {!image && (
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent z-10 flex items-center justify-evenly pb-8">
          {/* Flip camera (left) */}
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

          {/* Right spacer to keep shutter centered */}
          <div className="w-16 flex justify-center" />
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
