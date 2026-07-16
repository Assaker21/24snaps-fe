import { useEffect, useRef } from "react";

export default function Camera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null); // Reference for the fallback canvas
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

  // Helper function to trigger the download
  const downloadImage = (imageUrl, isObjectURL = false) => {
    const link = document.createElement("a");
    link.href = imageUrl;

    // Generate a unique filename using the current timestamp
    link.download = `capture_${Date.now()}.jpg`;

    // Append to body (required by Firefox to register the click)
    document.body.appendChild(link);
    link.click();

    // Clean up the DOM
    document.body.removeChild(link);

    // If we created a Blob URL in Method A, destroy it to free up memory
    if (isObjectURL) {
      setTimeout(() => URL.revokeObjectURL(imageUrl), 100);
    }
  };

  const handleCapture = async () => {
    const video = videoRef.current;

    // METHOD A: Hardware ImageCapture (Chrome/Edge/Android)
    if (imageCaptureRef.current) {
      try {
        const blob = await imageCaptureRef.current.takePhoto();
        const imageUrl = URL.createObjectURL(blob);
        console.log("Captured via ImageCapture:", imageUrl);

        // Pass true to indicate this is a Blob URL that needs cleanup
        downloadImage(imageUrl, true);
        return;
      } catch (error) {
        console.error("ImageCapture failed, falling back to Canvas:", error);
      }
    }

    // METHOD B: Canvas Fallback (Firefox/Safari/iOS)
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;

      // Sync canvas dimensions with the actual video stream resolution
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");

      // Draw the current video frame onto the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Extract the image as a base64 Data URL
      const imageUrl = canvas.toDataURL("image/jpeg", 0.95);
      console.log("Captured via Canvas Fallback:", imageUrl);

      // Data URLs are just strings, no memory cleanup needed
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

      {/* Hidden canvas used exclusively for taking pictures on unsupported browsers */}
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
