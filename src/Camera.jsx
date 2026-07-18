import { useEffect, useRef, useState, useCallback } from "react";
import "webrtc-adapter";

/**
 * Build getUserMedia constraints.
 * Never set both deviceId AND facingMode to avoid OverconstrainedError on Safari.
 */
function buildConstraints(deviceId, facingMode) {
  const video = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  };

  if (deviceId) {
    // Exact deviceId is the most specific — no facingMode allowed alongside
    video.deviceId = { exact: deviceId };
  } else {
    // Fall back to facing direction
    video.facingMode = facingMode || "environment";
  }

  return { audio: false, video };
}

export default function Camera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const imageCaptureRef = useRef(null);
  const streamRef = useRef(null);
  const isStartingRef = useRef(false);
  const isMountedRef = useRef(true);
  const availableCamerasRef = useRef([]);

  // Camera State
  const [facingMode, setFacingMode] = useState("environment");
  const [availableCameras, setAvailableCameras] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [zoomInfo, setZoomInfo] = useState(null);

  // Parse lens type from device label (e.g., iOS Safari labels)
  const getLensLabel = (label) => {
    const lower = label.toLowerCase();
    if (lower.includes("ultra")) return "0.5x";
    if (lower.includes("telephoto")) return "3x";
    if (lower.includes("front") || lower.includes("user")) return "Front";
    return "1x";
  };

  /** Enumerate video devices (must have active camera permissions first). */
  const enumerateCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      console.log("Video devices:", videoDevices);
      availableCamerasRef.current = videoDevices;
      if (isMountedRef.current) {
        setAvailableCameras(videoDevices);
      }
      return videoDevices;
    } catch (err) {
      console.error("Failed to enumerate devices:", err);
      return [];
    }
  }, []);

  /**
   * Small delay to allow the browser to release camera hardware.
   * Firefox Android (and some other mobile browsers) need this
   * between stopping a track and requesting a new getUserMedia,
   * otherwise "Starting videoinput failed" is thrown.
   */
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Start / restart the camera stream.
   *
   * - `deviceId` – exact camera to use (null = let browser pick via facingMode)
   * - `mode`     – facing direction (only used when deviceId is null)
   * - `retry`    – used internally; set to false to prevent infinite recursion
   *
   * Uses a regular async function so it can reference itself for retry logic.
   */
  async function startCameraImpl(deviceId, mode, retry) {
    deviceId = deviceId ?? null;
    mode = mode ?? "environment";
    retry = retry ?? true;

    // Prevent rapid calls
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    // Stop old stream before requesting new one
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      imageCaptureRef.current = null;
    }

    // Clear the video element's srcObject so it doesn't hold a stale reference
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Firefox Android needs time to release the camera hardware before
    // a new getUserMedia request can acquire it. Without this delay,
    // switching cameras produces "DOMException: Starting videoinput failed".
    // Only apply on the initial call (retry === true) to avoid piling up
    // delays during fallback retries.
    if (retry) {
      await delay(300);
    }

    const constraints = buildConstraints(deviceId, mode);

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (!isMountedRef.current) {
        // Component unmounted while we were waiting
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const videoTrack = stream.getVideoTracks()[0];

      // 1. Initialize ImageCapture (if supported)
      if ("ImageCapture" in window) {
        try {
          imageCaptureRef.current = new window.ImageCapture(videoTrack);
        } catch {
          // Some browsers expose ImageCapture but it may throw
          imageCaptureRef.current = null;
        }
      }

      // 2. Hardware Zoom Support Detection
      const capabilities = videoTrack.getCapabilities
        ? videoTrack.getCapabilities()
        : {};
      if (capabilities.zoom) {
        setZoomInfo({
          min: capabilities.zoom.min,
          max: capabilities.zoom.max,
          step: capabilities.zoom.step || 0.1,
          current: videoTrack.getSettings().zoom || 1,
        });
      } else {
        setZoomInfo(null);
      }

      // 3. Enumerate cameras to keep the device list fresh.
      // Firefox Android changes deviceId after every getUserMedia call,
      // so we must re-enumerate each time, not just on first boot.
      await enumerateCameras();

      // 4. Sync active device ID with the actual hardware track
      const trackSettings = videoTrack.getSettings
        ? videoTrack.getSettings()
        : {};
      const devices = availableCamerasRef.current;
      const activeDevice =
        devices.find((d) => d.deviceId === trackSettings.deviceId) ||
        devices.find((d) => d.label === videoTrack.label) ||
        devices[0];
      if (activeDevice && isMountedRef.current) {
        setActiveDeviceId(activeDevice.deviceId);
      }

      // 5. Start playback
      if (videoRef.current) {
        await videoRef.current.play();
      }
    } catch (error) {
      console.error("Failed to start camera:", error);

      // Retry once with relaxed constraints (remove width/height/frameRate ideals)
      if (retry) {
        console.warn("Retrying with relaxed constraints...");
        // Kill isStartingRef so the recursive call can proceed
        isStartingRef.current = false;
        await startCameraImpl(deviceId, mode, false);
        return; // Don't clear the flag again below
      }

      // Final fallback: try without deviceId if it was set
      if (deviceId) {
        console.warn("Retrying without deviceId...");
        isStartingRef.current = false;
        await startCameraImpl(null, mode, false);
        return;
      }

      // All retries exhausted – reset any stale UI state so the user
      // doesn't see phantom zoom controls or lens labels
      if (isMountedRef.current) {
        setActiveDeviceId(null);
        setZoomInfo(null);
      }
    } finally {
      isStartingRef.current = false;
    }
  }

  // Memoized version so it stays stable across re-renders
  // startCameraImpl is a hoisted function declaration (stable reference) — not needed in deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const startCamera = useCallback(startCameraImpl, [enumerateCameras]);

  // Initial Boot – runs only once thanks to the ref guard
  useEffect(() => {
    isMountedRef.current = true;
    startCamera(null, "environment");
    return () => {
      isMountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  // --- Controls ---

  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(null, nextMode); // Pass null for deviceId to rely on facingMode
  };

  /**
   * Determine whether a device is a rear/environment camera.
   * Uses label heuristics for cross-browser compatibility.
   */
  const isBackCamera = (cam) => {
    const lower = cam.label.toLowerCase();
    return (
      lower.includes("back") ||
      lower.includes("rear") ||
      lower.includes("environment") ||
      // Some Android devices omit "back" but have multiple cameras;
      // if the label contains "ultra", "telephoto", "wide", "macro" it's typically back
      lower.includes("ultra") ||
      lower.includes("telephoto") ||
      // Fallback: assume a non-front camera is back
      (!lower.includes("front") && !lower.includes("user") && lower.length > 0)
    );
  };

  const cycleLenses = () => {
    const devices = availableCamerasRef.current;
    // Filter for back cameras only
    const backCams = devices.filter(isBackCamera);

    if (backCams.length < 2) return; // No alternative lenses available

    const currentIndex = backCams.findIndex(
      (cam) => cam.deviceId === activeDeviceId,
    );
    const nextIndex = (currentIndex + 1) % backCams.length;
    const nextCam = backCams[nextIndex];

    setFacingMode("environment");
    startCamera(nextCam.deviceId, "environment");
  };

  // Zoom updates hardware instantly via track constraints (no stream restart required)

  const handleZoomChange = (e) => {
    const newZoom = parseFloat(e.target.value);
    setZoomInfo((prev) => ({ ...prev, current: newZoom }));

    const track = streamRef.current?.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      // Use flat constraint (not advanced[]) for Safari compatibility
      track
        .applyConstraints({ zoom: newZoom })
        .catch((err) => console.error(err));
    }
  };

  // --- Capture & Download (Unchanged) ---

  const downloadImage = (imageUrl, isObjectURL = false) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `capture_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (isObjectURL) setTimeout(() => URL.revokeObjectURL(imageUrl), 100);
  };

  const handleCapture = async () => {
    const video = videoRef.current;
    if (imageCaptureRef.current) {
      try {
        const blob = await imageCaptureRef.current.takePhoto();
        const imageUrl = URL.createObjectURL(blob);
        downloadImage(imageUrl, true);
        return;
      } catch (error) {
        console.error("ImageCapture failed, falling back:", error);
      }
    }
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      downloadImage(canvas.toDataURL("image/jpeg", 0.95), false);
    }
  };

  // Determine current active lens label for UI
  const activeLens = availableCameras.find(
    (d) => d.deviceId === activeDeviceId,
  );
  const lensText = activeLens ? getLensLabel(activeLens.label) : "1x";
  const backCamsCount = availableCameras.filter(isBackCamera).length;

  return (
    <div className="w-screen h-screen absolute top-0 left-0 bg-black overflow-hidden flex flex-col">
      {/* Viewfinder */}
      <video
        className="w-full h-full object-cover absolute top-0 left-0 transition-transform duration-300"
        ref={videoRef}
        autoPlay
        muted
        playsInline
        // Mirror the video if using front camera so it acts like a mirror
        style={{
          transform: facingMode === "user" ? "scaleX(-1)" : "scaleX(1)",
        }}
      />

      <canvas ref={canvasRef} className="hidden" />

      {/* Top Controls: Zoom Slider (If supported by hardware) */}
      {zoomInfo && (
        <div className="absolute top-10 left-0 w-full px-8 z-10 flex flex-col items-center gap-2">
          <span className="text-white text-xs font-bold drop-shadow-md bg-black/30 px-2 py-1 rounded">
            Zoom: {zoomInfo.current.toFixed(1)}x
          </span>
          <input
            type="range"
            min={zoomInfo.min}
            max={zoomInfo.max}
            step={zoomInfo.step}
            value={zoomInfo.current}
            onChange={handleZoomChange}
            className="w-full max-w-[200px] accent-white"
          />
        </div>
      )}

      {/* Bottom Controls */}
      <div className="w-full h-32 absolute bottom-0 flex items-center justify-evenly pb-8 z-10 bg-gradient-to-t from-black/80 to-transparent">
        {/* Cycle Lenses (Only show if multiple back cameras exist) */}
        <div className="w-16 flex justify-center">
          {backCamsCount > 1 && facingMode === "environment" && (
            <button
              onClick={cycleLenses}
              className="px-3 py-2 bg-black/50 text-white rounded-full text-sm font-bold backdrop-blur-sm border border-white/20 active:scale-90 transition-transform"
            >
              {lensText}
            </button>
          )}
        </div>

        {/* Shutter Button */}
        <button
          onClick={handleCapture}
          className="w-20 h-20 bg-white rounded-full active:scale-90 transition-transform duration-75 ease-out shadow-[0_0_0_4px_rgba(255,255,255,0.3)]"
          aria-label="Take Photo"
        />

        {/* Reverse Camera */}
        <div className="w-16 flex justify-center">
          <button
            onClick={toggleFacingMode}
            className="p-3 bg-black/50 text-white rounded-full backdrop-blur-sm border border-white/20 active:scale-90 transition-transform flex items-center justify-center"
            aria-label="Flip Camera"
          >
            {/* Simple flip icon using SVG */}
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
              <polyline points="1 4 1 10 7 10"></polyline>
              <polyline points="23 20 23 14 17 14"></polyline>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
