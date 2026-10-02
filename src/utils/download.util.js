// The one place a file is handed to the browser.
//
// Every download in the app used to build its own detached <a download> and revoke the
// object URL on the next line, which works in Chrome and silently does nothing in
// Safari. Safari needs two things Chrome doesn't care about:
//
//   - the anchor has to be in the document. A click on a detached element is ignored.
//   - the object URL has to outlive the click. Safari starts the save asynchronously,
//     so revoking in the same tick cancels the download before it begins.
//
// Both are handled here, so no caller has to remember either.

// Old iOS WebKit has no `download` attribute at all; opening the blob is the most a
// browser like that can do (the user saves it from the viewer).
function supportsDownloadAttribute() {
  return "download" in document.createElement("a");
}

// Keeps a filename usable on every platform — a slash or a colon in an event's name
// would otherwise be taken as a path.
export function safeFileName(name, fallback = "download") {
  const cleaned = String(name || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

export function saveBlob(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);

  if (!supportsDownloadAttribute()) {
    window.open(objectUrl, "_blank");
    // Nothing local is holding this open, so it has to outlive the new tab's load.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return;
  }

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = safeFileName(fileName);
  link.rel = "noopener";
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  // Long enough for Safari to have taken the bytes, short enough not to pin a
  // full-resolution photo in memory for the rest of the session.
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }, 30_000);
}

// Last resort when the bytes can't be fetched (a CORS hiccup on the storage redirect):
// show the file instead of saving it. `window.open` is popup-blocked in Safari once the
// user's gesture has been spent on an await, so a blocked window falls back to
// navigating — which Safari always allows.
export function openInstead(url) {
  const opened = window.open(url, "_blank", "noopener");
  if (!opened) window.location.assign(url);
}

// Fetch a URL and save what comes back, falling back to showing it. `fileName` may be a
// function of the blob, for callers that name the file after its real content type.
export async function downloadUrl(url, fileName) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed (${response.status})`);

    const blob = await response.blob();
    saveBlob(blob, typeof fileName === "function" ? fileName(blob) : fileName);
    return true;
  } catch {
    openInstead(url);
    return false;
  }
}
