import attachmentsService from "../services/attachments.service";
import {
  saveCapture,
  deleteCapture,
  listCaptures,
  listUnownedCaptures,
  reassignCaptures,
} from "./uploadStore.util";
import uploadFile from "./upload.util";

// A module-level (not React-owned) FIFO for attachment uploads, so a capture keeps
// uploading after the page that queued it unmounts — the Camera page navigates away the
// moment the last shot is taken, and that shot must still land. Mirrors the backend's
// in-process image queue: bounded concurrency, a few automatic retries, then the item
// parks in `failed` for the user to retry or discard by hand.
//
// Every capture is also written to IndexedDB on the way in and only deleted once the
// server has the attachment (see uploadStore.util.js), so closing the tab mid-upload
// postpones a shot rather than losing it.
//
// Nothing uploads until an owner is set. A capture belongs to one account — it counts
// against that account's frames, and the storage key it goes up to is signed for that
// account's id — so the queue holds only the signed-in user's items and resumes only
// their stored captures. `setOwner` (called from AuthProvider once the session is
// resolved, and again on every change of user) is what starts and re-scopes it.

const MAX_CONCURRENT = 2;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1500;
// Who the queue last belonged to, so a sign-in can tell "the same person came back"
// from "someone else is using this browser now" before any blob is touched.
const OWNER_STORAGE_KEY = "pendingUploadsOwner";

let items = [];
let active = 0;
// { id, guest } once known, null while the visitor has no resolved session at all.
let owner = null;
const listeners = new Set();

function newId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emit(event) {
  const snapshot = items;
  listeners.forEach((listener) => listener(snapshot, event));
}

function patch(id, changes) {
  items = items.map((item) => (item.id === id ? { ...item, ...changes } : item));
}

function find(id) {
  return items.find((item) => item.id === id);
}

function hasUnfinished() {
  return items.some(
    (item) => item.status === "pending" || item.status === "uploading",
  );
}

// The capture itself survives a reload now, so this is no longer about losing the
// photo — it's that leaving stops the retries until the user comes back.
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (e) => {
    if (!hasUnfinished()) return;
    e.preventDefault();
    e.returnValue = "";
  });

  // Uploads fail in bursts, and the burst is almost always the connection dropping.
  // Coming back online is the one signal worth acting on without being asked.
  window.addEventListener("online", () => {
    items
      .filter((item) => item.status === "failed")
      .forEach((item) => retry(item.id));
  });
}

// Only the fields worth resuming from — the status/error/timing churn the React side
// reads would mean a write per state change for nothing.
function persist(item) {
  return saveCapture({
    id: item.id,
    userId: item.userId,
    blob: item.blob,
    contentType: item.contentType,
    eventId: item.eventId,
    type: item.type,
    storageKey: item.storageKey,
    createdAt: item.createdAt,
  });
}

function pump() {
  // No session resolved yet: an upload now would be attributed to nobody — or, worse,
  // charged to whoever signs in next.
  if (!owner) return;

  while (active < MAX_CONCURRENT) {
    const next = items.find(
      (item) =>
        item.status === "pending" &&
        item.userId === owner.id &&
        (!item.readyAt || item.readyAt <= Date.now()),
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
      // A fresh presigned URL per attempt, which is also how a resumed capture
      // recovers: the link the previous session was handed expires in five minutes, so
      // a capture picked back up asks for a new one rather than PUTing to a dead
      // signature.
      storageKey = await uploadFile(item.blob, item.contentType, {
        eventId: item.eventId,
        type: item.type,
      });
      // Written back before the attachment call, so a tab closed between the two
      // resumes from the uploaded bytes instead of pushing them a second time.
      if (find(id)) await persist({ ...item, storageKey });
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
    deleteCapture(id);
    emit({ type: "success", id, eventId: item.eventId, attachment });
    pump();
    return;
  }

  // Discarded mid-flight, or the signed-in user changed under us — either way there is
  // nothing left to update.
  if (!find(id)) {
    pump();
    return;
  }

  const attempts = (find(id).attempts || 0) + 1;

  if (attempts < MAX_ATTEMPTS) {
    const delay = RETRY_BASE_DELAY_MS * attempts;
    patch(id, {
      status: "pending",
      attempts,
      storageKey,
      error,
      readyAt: Date.now() + delay,
    });
    emit();
    setTimeout(pump, delay);
  } else {
    patch(id, { status: "failed", attempts, storageKey, error, readyAt: null });
    emit({ type: "failed", id, eventId: item.eventId, error });
  }

  pump();
}

// Queues one capture. Returns the item id; the blob is held (in memory and in the
// capture store) until the upload lands, so a retry never has to go back to the camera.
function enqueue({ blob, contentType, eventId, type }) {
  const item = {
    id: newId(),
    userId: owner?.id ?? null,
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
  };

  items = [...items, item];
  persist(item);

  emit();
  pump();
  return item.id;
}

function readStoredOwner() {
  try {
    const raw = localStorage.getItem(OWNER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Only ever records a real owner. "No session right now" is a transient state — a
// token that expired, a request that didn't land — and forgetting who this browser
// belonged to would lose the one fact the guest-merge check below needs.
function writeStoredOwner(next) {
  if (!next) return;

  try {
    localStorage.setItem(OWNER_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode, or storage full. The queue still works for this session.
  }
}

// Tells the queue who is signed in: called from AuthProvider once the session is
// resolved, and again whenever it changes — a sign-in, a sign-out, a different account.
//
// Switching users never uploads or deletes the previous user's captures: they leave
// memory, stay in the store, and come back if that user signs in again.
async function setOwner(next) {
  const normalized =
    next?.id != null ? { id: next.id, guest: !!next.guest } : null;

  if (owner?.id === normalized?.id) {
    // Same person — only their guest/registered standing can have changed, and the
    // merge check below reads it, so keep it current.
    if (normalized) {
      owner = normalized;
      writeStoredOwner(normalized);
    }
    return;
  }

  const previous = owner ?? readStoredOwner();
  owner = normalized;
  writeStoredOwner(normalized);

  // Anything in memory belongs to whoever was signed in a moment ago, and goes with
  // them. An upload already in flight can't be recalled, but dropping its item here
  // makes `run` treat the result as discarded; the capture stays in the store either
  // way, so nothing is lost — it is waiting for its owner to come back.
  //
  // Captures taken before any session resolved are the exception: they have no owner to
  // return to, so the user now in front of us claims them, exactly as the store below
  // claims their records. The storage key goes, since it was never signed for anyone.
  const claimed = items
    .filter((item) => item.userId == null || item.userId === normalized?.id)
    .map((item) =>
      normalized && item.userId == null
        ? { ...item, userId: normalized.id, storageKey: null }
        : item,
    );

  if (claimed.length !== items.length || claimed.some((item, i) => item !== items[i])) {
    items = claimed;
    emit();
  }

  if (!normalized) return;

  // The one case where captures legitimately change hands: this device was a guest,
  // that guest has just signed into an existing account, and the backend folded the
  // guest's rows into it (users.js#mergeGuestInto). Their unfinished shots are the same
  // person's, so they follow — minus the storage key, which named the old id.
  if (previous?.guest && previous.id !== normalized.id) {
    const orphans = await listCaptures(previous.id);
    await reassignCaptures(orphans, normalized.id);
  }

  // Captures from before the store recorded an owner at all. There was only ever one
  // user's worth of them, and this is the user in front of us.
  const unowned = await listUnownedCaptures();
  await reassignCaptures(unowned, normalized.id);

  await hydrate(normalized.id);

  // The owner is what gates `pump`, so this is the start signal: it covers items
  // claimed above as well as anything the store had nothing new to add to.
  pump();
}

// Reads back whatever the last session couldn't finish, for one user only. Restored
// captures come back as `pending` with a clean attempt count rather than as the
// failures they may have been: the usual reason an upload runs out of attempts is a
// connection that a fresh session is the best evidence yet of having recovered.
async function hydrate(userId) {
  const records = await listCaptures(userId);
  if (!records.length) return;

  // The user changed while this was reading — the answer is for the wrong person now.
  if (owner?.id !== userId) return;

  const known = new Set(items.map((item) => item.id));
  const restored = records
    .filter((record) => record.blob && !known.has(record.id))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    .map((record) => ({
      ...record,
      userId,
      status: "pending",
      attempts: 0,
      error: null,
      readyAt: null,
    }));

  if (!restored.length) return;

  // Ahead of anything queued since load: these have been waiting the longest.
  items = [...restored, ...items];
  emit();
  pump();
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
  deleteCapture(id);
  emit();
}

// The only path that throws a capture away without it ever reaching the server, so it
// is also the only place the stored blob is deleted before a successful upload.
function discardFailed(eventId) {
  items
    .filter((item) => item.status === "failed" && item.eventId === eventId)
    .forEach((item) => deleteCapture(item.id));

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
  setOwner,
  enqueue,
  retry,
  retryAllFailed,
  discard,
  discardFailed,
  getItems,
  subscribe,
};
