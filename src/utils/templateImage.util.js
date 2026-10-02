import templatesService from "../services/templates.service";
import { downloadUrl, safeFileName, saveBlob, openInstead } from "./download.util";

// Getting an event's drawn template off the server and into the host's hands — the
// same two actions from the Templates sheet (where the card is set up) and the Share
// sheet (where a finished album is handed out), so they can't drift apart.
//
// The image is fetched as a blob rather than linked: it needs a sensible filename, and
// navigator.share wants a File. Saving goes through download.util so Safari's
// requirements (an attached anchor, an object URL that outlives the click) are met in
// one place; a CORS hiccup on the storage redirect falls back to showing the image.

function fileNameFor(event) {
  return safeFileName(`${event?.name || "event"}-card.jpg`, "event-card.jpg");
}

export function downloadTemplateImage(event, generatedAt) {
  return downloadUrl(
    templatesService.getImageSrc(event.id, generatedAt),
    fileNameFor(event),
  );
}

// Shares the image itself where the browser supports it, so it lands in a chat as a
// picture rather than a link. Everywhere else — and on cancel — it saves instead,
// which is the same thing the host was reaching for.
export async function shareTemplateImage(event, generatedAt) {
  const src = templatesService.getImageSrc(event.id, generatedAt);
  const name = fileNameFor(event);

  let blob;
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`Fetch failed (${response.status})`);
    blob = await response.blob();
  } catch {
    openInstead(src);
    return false;
  }

  const file = new File([blob], name, { type: blob.type });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: event?.name });
      return true;
    } catch {
      // Cancelled, or the browser refused — fall through to saving it.
    }
  }

  saveBlob(blob, name);
  return true;
}
