import { useEffect, useRef } from "react";

export default function Camera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const imageCaptureRef = useRef(null);

  useEffect(() => {
    let stream;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 60, min: 30 },
          },
          audio: false,
        });

        const video = videoRef.current;
        video.srcObject = stream;

        const videoTrack = stream.getVideoTracks()[0];

        // Feature Detection: Only initialize if supported
        if ("ImageCapture" in window) {
          imageCaptureRef.current = new window.ImageCapture(videoTrack);
        }

        await video.play();
      } catch (error) {
        console.error("Failed to start camera:", error);
      }
    }

    start();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const downloadImage = (imageUrl, isObjectURL = false) => {
    const link = document.createElement("a");
    link.href = imageUrl;

    link.download = `capture_${Date.now()}.jpg`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);

    if (isObjectURL) {
      setTimeout(() => URL.revokeObjectURL(imageUrl), 100);
    }
  };

  const handleCapture = async () => {
    const video = videoRef.current;

    if (imageCaptureRef.current) {
      try {
        const blob = await imageCaptureRef.current.takePhoto();
        const imageUrl = URL.createObjectURL(blob);
        console.log("Captured via ImageCapture:", imageUrl);

        downloadImage(imageUrl, true);
        return;
      } catch (error) {
        console.error("ImageCapture failed, falling back to Canvas:", error);
      }
    }

    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageUrl = canvas.toDataURL("image/jpeg", 0.95);
      console.log("Captured via Canvas Fallback:", imageUrl);

      downloadImage(imageUrl, false);
    }
  };

  return (
    <div className="w-screen h-screen absolute top-0 left-0 bg-black">
      <video
        className="w-full h-full object-cover"
        ref={videoRef}
        autoPlay
        muted
        playsInline
      />

      <canvas ref={canvasRef} className="hidden" />

      <div className="w-full h-32 absolute bottom-0 flex items-center justify-center pb-8">
        <button
          onClick={handleCapture}
          className="w-20 h-20 bg-white rounded-full active:scale-95 transition-transform duration-100 ease-out shadow-lg"
          aria-label="Take Photo"
        />
      </div>
    </div>
  );
}
