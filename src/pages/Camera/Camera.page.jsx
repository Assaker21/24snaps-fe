import { useRef, useState } from "react";
import { Camera } from "react-camera-pro";

export default function CameraPage() {
  const camera = useRef(null);
  const [options, setOptions] = useState({ facingMode: null });
  const [stats, setStats] = useState({ numberOfCameras: 0 });
  const [image, setImage] = useState(null);

  function handleCapture() {
    const image = camera.current.takePhoto();
    setImage(image);
  }

  return (
    <div className="w-screen h-screen absolute top-0 left-0 bg-black">
      <Camera
        ref={camera}
        facingMode={options.facingMode}
        numberOfCamerasCallback={(numberOfCameras) =>
          setStats({ ...stats, numberOfCameras })
        }
      />

      <div className="w-full h-32 absolute bottom-0 flex items-center justify-between pb-8 px-8">
        <div className="w-20">
          {stats.numberOfCameras > 1 ? (
            <div className="w-16 flex justify-center">
              <button
                onClick={() => {
                  setOptions((o) => ({
                    ...o,
                    facingMode: camera.current.switchCamera(),
                  }));
                }}
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
            </div>
          ) : null}
        </div>
        <button
          onClick={handleCapture}
          className="w-20 h-20 bg-white rounded-full active:scale-95 transition-transform duration-100 ease-out shadow-lg"
          aria-label="Take Photo"
        />
        <div className="w-20" />
      </div>

      <img
        src={image}
        className="w-full h-full absolute top-0 left-0 pointer-events-none"
      />
    </div>
  );
}
