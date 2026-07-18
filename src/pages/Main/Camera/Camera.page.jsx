import { useRef, useState, useCallback } from "react";
import { Camera } from "react-camera-pro";

export default function CameraPage() {
  const camera = useRef(null);
  const [image, setImage] = useState(null);
  const [numCameras, setNumCameras] = useState(0);
  const [facingMode, setFacingMode] = useState("environment");

  // Memoized callback to avoid re-renders
  const handleNumberOfCameras = useCallback((count) => {
    setNumCameras(count);
  }, []);

  const handleCapture = useCallback(() => {
    if (!camera.current) return;
    const photo = camera.current.takePhoto();
    setImage(photo);
  }, []);

  const handleFlip = useCallback(() => {
    if (!camera.current) return;
    const nextMode = camera.current.switchCamera();
    setFacingMode(nextMode);
  }, []);

  const handleRetake = useCallback(() => {
    setImage(null);
  }, []);

  return (
    <div className="w-screen h-screen absolute top-0 left-0 bg-black overflow-hidden">
      {/* Camera viewfinder */}
      {!image && (
        <Camera
          ref={camera}
          facingMode={facingMode}
          numberOfCamerasCallback={handleNumberOfCameras}
        />
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
          <button
            onClick={handleCapture}
            className="w-20 h-20 bg-white rounded-full active:scale-90 transition-transform duration-75 ease-out shadow-[0_0_0_4px_rgba(255,255,255,0.3)]"
            aria-label="Take Photo"
          />

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
            <div className="w-16 flex justify-center" />
            <button
              onClick={handleRetake}
              className="px-8 py-3 bg-white/20 backdrop-blur-md text-white rounded-full text-sm font-bold border border-white/30 active:scale-90 transition-transform"
            >
              Retake
            </button>
            <div className="w-16 flex justify-center" />
          </div>
        </>
      )}
    </div>
  );
}
