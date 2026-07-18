import { useRef, useState, useEffect } from "react";
import { Camera } from "react-camera-pro";

if (typeof window !== "undefined" && typeof MediaDeviceInfo !== "undefined") {
  if (!MediaDeviceInfo.prototype.getCapabilities) {
    MediaDeviceInfo.prototype.getCapabilities = () => ({});
  }
}

export default function CameraPage() {
  const camera = useRef(null);

  // Core camera states
  const [options, setOptions] = useState({ facingMode: "environment" });
  const [stats, setStats] = useState({ numberOfCameras: 0 });
  const [image, setImage] = useState(null);

  // Lens selection states
  const [devices, setDevices] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState(undefined);

  // 1. Fetch all available lenses on mount
  useEffect(() => {
    async function fetchLenses() {
      try {
        // You usually must request permission once before the browser
        // will reveal the actual labels (names) of the lenses.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        // Fetch all media devices
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();

        // Filter out microphones, keep only video inputs
        const videoDevices = mediaDevices.filter(
          (d) => d.kind === "videoinput",
        );
        setDevices(videoDevices);
        setActiveDeviceId(videoDevices?.[0]?.deviceId);

        // Stop the temporary permission stream so react-camera-pro can use it
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.error(
          "Camera permissions not granted or enumeration failed.",
          err,
        );
      }
    }
    fetchLenses();
  }, []);

  function handleCapture() {
    const img = camera.current.takePhoto();
    setImage(img);
  }

  // 2. Handle flipping between Front/Back
  function handleFlip() {
    // We must clear any explicit lens selection, otherwise it overrides the facing mode
    setActiveDeviceId(undefined);
    setOptions((o) => ({
      ...o,
      facingMode: camera.current.switchCamera(),
    }));
  }

  return (
    <div className="w-screen h-screen absolute top-0 left-0 bg-black overflow-hidden">
      <Camera
        ref={camera}
        facingMode={options.facingMode}
        videoSourceDeviceId={activeDeviceId}
        numberOfCamerasCallback={(numberOfCameras) =>
          setStats((prev) => ({ ...prev, numberOfCameras }))
        }
      />

      {/* 3. LENS SELECTION UI */}
      {/* Renders a row of buttons for "Ultra Wide", "Telephoto", etc. at the top */}
      {devices.length > 1 && !image && (
        <div className="absolute top-12 w-full flex justify-center gap-2 z-10 px-4 overflow-x-auto pb-4">
          {devices.map((device, index) => {
            const isSelected = activeDeviceId === device.deviceId;
            // Fallback label if the browser hides the real name
            const label = device.label || `Lens ${index + 1}`;

            return (
              <button
                key={device.deviceId}
                onClick={() => setActiveDeviceId(device.deviceId)}
                className={`px-4 py-2 text-xs rounded-full whitespace-nowrap transition-colors border ${
                  isSelected
                    ? "bg-white text-black border-white shadow-lg"
                    : "bg-black/50 text-white border-white/20 backdrop-blur-md"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* BOTTOM CONTROLS */}
      <div className="w-full h-32 absolute bottom-0 flex items-center justify-between pb-8 px-8 z-10">
        <div className="w-20">
          {stats.numberOfCameras > 1 && !image ? (
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
                <polyline points="1 4 1 10 7 10"></polyline>
                <polyline points="23 20 23 14 17 14"></polyline>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
              </svg>
            </button>
          ) : null}
        </div>

        {/* Shutter Button */}
        {!image && (
          <button
            onClick={handleCapture}
            className="w-20 h-20 bg-white rounded-full active:scale-95 transition-transform duration-100 ease-out shadow-lg border-4 border-gray-300"
            aria-label="Take Photo"
          />
        )}

        {/* Clear Image Button (Replaces shutter when previewing) */}
        <div className="w-20 flex justify-end">
          {image && (
            <button
              onClick={() => setImage(null)}
              className="p-3 bg-black/70 text-white rounded-full backdrop-blur-sm border border-white/30"
            >
              Retake
            </button>
          )}
        </div>
      </div>

      {/* IMAGE PREVIEW */}
      {image && (
        <img
          src={image}
          alt="Captured"
          className="w-full h-full absolute top-0 left-0 object-cover z-20 pointer-events-none"
        />
      )}
    </div>
  );
}
