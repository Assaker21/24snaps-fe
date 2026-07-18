import { useEffect, useState } from "react";
import { Camera } from "react-camera-pro";
import "webrtc-adapter";

export default function TestingPage() {
  const [cameras, setCameras] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        // 1. Request global camera permission FIRST.
        // Without this, enumerateDevices() will hide device labels and IDs to prevent fingerprinting.
        const initialStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        // 2. Enumerate all connected media devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput",
        );

        // 3. Clean up the initial permission stream so the camera light turns off
        initialStream.getTracks().forEach((track) => track.stop());

        // 4. Probe each camera individually for its capabilities
        const camerasWithCaps = await Promise.all(
          videoDevices.map(async (device) => {
            let capabilities = {};
            let settings = {};

            try {
              // To read actual hardware limits, we must briefly open a stream to this specific device
              const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: device.deviceId } },
              });
              const track = stream.getVideoTracks()[0];

              // getCapabilities() returns maximum hardware bounds (resolutions, frame rates)
              if (typeof track.getCapabilities === "function") {
                capabilities = track.getCapabilities();
              }

              // getSettings() returns the currently active configuration of the track
              if (typeof track.getSettings === "function") {
                settings = track.getSettings();
              }

              // Immediately close the track to free up the hardware
              track.stop();
            } catch (err) {
              console.warn(
                `Failed to read capabilities for ${device.label}:`,
                err,
              );
            }

            return {
              deviceId: device.deviceId,
              label:
                device.label ||
                `Unknown Camera (${device.deviceId.substring(0, 8)})`,
              capabilities,
              settings,
            };
          }),
        );

        setCameras(camerasWithCaps);
      } catch (err) {
        setError(
          err.name === "NotAllowedError"
            ? "Camera permission denied. Please allow access to list capabilities."
            : err.message,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCameras();
  }, []);

  if (loading) return <div className="p-4">Scanning hardware...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4 font-sans">
      <h2 className="text-xl font-bold mb-4">
        Detected Cameras ({cameras.length})
      </h2>

      <div className="flex flex-col gap-6">
        {cameras.map((camera) => (
          <div
            key={camera.deviceId}
            className="border p-4 rounded-lg bg-gray-50"
          >
            <h3 className="font-semibold text-lg mb-1">{camera.label}</h3>
            <p className="text-sm text-gray-600 mb-4 font-mono">
              ID: {camera.deviceId}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Capabilities (Max Limits)</h4>
                {Object.keys(camera.capabilities).length > 0 ? (
                  <pre className="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(camera.capabilities, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    Not supported by this browser.
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Current Settings</h4>
                {Object.keys(camera.settings).length > 0 ? (
                  <pre className="bg-gray-800 text-blue-400 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(camera.settings, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    Not supported by this browser.
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Camera videoSourceDeviceId={deviceId} />
    </div>
  );
}
