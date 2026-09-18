import templatesService from "../services/templates.service";

// Getting an event's drawn template off the server and into the host's hands — the
// same two actions from the Templates sheet (where the card is set up) and the Share
// sheet (where a finished album is handed out), so they can't drift apart.
//
// The image is fetched as a blob rather than linked: it needs a sensible filename, and
// navigator.share wants a File. A CORS hiccup on the storage redirect falls back to a
// plain navigation, exactly as the photo viewer's download does.

function fileNameFor(event) {
  const base = `${event?.name || "event"}-card.jpg`;
  return base.replace(/[\\/:*?"<>|]/g, "-");
}

async function withImage(event, generatedAt, action) {
  const src = templatesService.getImageSrc(event.id, generatedAt);

  try {
    const blob = await fetch(src).then((response) => response.blob());
    await action(blob, fileNameFor(event));
  } catch {
    window.open(src, "_blank");
  }
}

function saveBlob(blob, name) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = name;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export function downloadTemplateImage(event, generatedAt) {
  return withImage(event, generatedAt, saveBlob);
}

// Shares the image itself where the browser supports it, so it lands in a chat as a
// picture rather than a link. Everywhere else — and on cancel — it saves instead,
// which is the same thing the host was reaching for.
export function shareTemplateImage(event, generatedAt) {
  return withImage(event, generatedAt, async (blob, name) => {
    const file = new File([blob], name, { type: blob.type });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: event?.name });
        return;
      } catch {
        // Cancelled, or the browser refused — fall through to saving it.
      }
    }

    saveBlob(blob, name);
  });
}
