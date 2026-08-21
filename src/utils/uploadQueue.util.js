import attachmentsService from "../services/attachments.service";
import uploadFile from "./upload.util";

// A module-level (not React-owned) FIFO for attachment uploads, so a capture keeps
// uploading after the page that queued it unmounts — the Camera page navigates away the
// moment the last shot is taken, and that shot must still land. Mirrors the backend's
// in-process image queue: bounded concurrency, a few automatic retries, then the item
// parks in `failed` for the user to retry or discard by hand.

const MAX_CONCURRENT = 2;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1500;

let items = [];
let active = 0;
let nextId = 1;
const listeners = new Set();

function emit(event) {
  const snapshot = items;
  listeners.forEach((listener) => listener(snapshot, event));
}

function patch(id, changes) {
  items = items.map((item) =>
    item.id === id ? { ...item, ...changes } : item,
  );
}

function find(id) {
  return items.find((item) => item.id === id);
}

function hasUnfinished() {
  return items.some(
    (item) => item.status === "pending" || item.status === "uploading",
  );
}

// A hard reload/close is the one thing the queue can't survive, so it's the one thing
// worth interrupting the user for.
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (e) => {
    if (!hasUnfinished()) return;
    e.preventDefault();
    e.returnValue = "";
  });
}

function pump() {
  while (active < MAX_CONCURRENT) {
    const next = items.find(
      (item) =>
        item.status === "pending" && (!item.readyAt || item.readyAt <= Date.now()),
    );
    if (!next) return;

    active += 1;
    patch(next.id, { status: "uploading" });
    emit();
    run(next.id);
  }
}

async function run(id) {
  const item = find(id);
  if (!item) {
    active -= 1;
    pump();
    return;
  }

  let error = null;
  let attachment = null;
  // Reuse the key from a previous attempt that got the bytes up but failed to record
  // the attachment — re-PUTing would only orphan another object in R2.
  let storageKey = item.storageKey;

  // Only the network work belongs in here; a listener throwing during the success
  // bookkeeping below must not be mistaken for a failed upload and retried.
  try {
    if (!storageKey) {
      storageKey = await uploadFile(item.blob, item.contentType, {
        eventId: item.eventId,
        type: item.type,
      });
    }

    const response = await attachmentsService.create({
      storageKey,
      type: item.type,
      eventId: item.eventId,
    });

    if (response.ok) attachment = response.data;
    else error = response.data?.message || `Save failed (${response.status})`;
  } catch (err) {
    error = err?.message || "Upload failed";
  }

  active -= 1;

  if (attachment) {
    // Terminal success drops the item entirely: consumers track finished uploads
    // through the `success` event, and the server's own count covers them after that.
    items = items.filter((i) => i.id !== id);
    emit({ type: "success", id, eventId: item.eventId, attachment });
    pump();
    return;
  }

  // Discarded mid-flight — nothing left to update.
  if (!find(id)) {
    pump();
    return;
  }

  const attempts = (find(id).attempts || 0) + 1;

  if (attempts < MAX_ATTEMPTS) {
    const delay = RETRY_BASE_DELAY_MS * attempts;
    patch(id, { status: "pending", attempts, storageKey, error, readyAt: Date.now() + delay });
    emit();
    setTimeout(pump, delay);
  } else {
    patch(id, { status: "failed", attempts, storageKey, error, readyAt: null });
    emit({ type: "failed", id, eventId: item.eventId, error });
  }

  pump();
}

// Queues one capture. Returns the item id; the blob is held until the upload lands so a
// retry never has to go back to the camera.
function enqueue({ blob, contentType, eventId, type }) {
  const id = nextId++;

  items = [
    ...items,
    {
      id,
      blob,
      contentType: contentType || blob?.type || "image/jpeg",
      eventId,
      type,
      status: "pending",
      attempts: 0,
      storageKey: null,
      error: null,
      readyAt: null,
      createdAt: Date.now(),
    },
  ];

  emit();
  pump();
  return id;
}

function retry(id) {
  const item = find(id);
  if (!item || item.status !== "failed") return;

  patch(id, { status: "pending", attempts: 0, error: null, readyAt: null });
  emit();
  pump();
}

function retryAllFailed(eventId) {
  items
    .filter((item) => item.status === "failed" && item.eventId === eventId)
    .forEach((item) => retry(item.id));
}

// Gives up on an item for good. An in-flight upload can't be aborted, but dropping the
// row here makes `run` treat its result as discarded.
function discard(id) {
  items = items.filter((item) => item.id !== id);
  emit();
}

function discardFailed(eventId) {
  items = items.filter(
    (item) => !(item.status === "failed" && item.eventId === eventId),
  );
  emit();
}

function getItems() {
  return items;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export default {
  enqueue,
  retry,
  retryAllFailed,
  discard,
  discardFailed,
  getItems,
  subscribe,
};
