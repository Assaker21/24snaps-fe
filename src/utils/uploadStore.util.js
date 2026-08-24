// Durable holding pen for captures that haven't reached the server yet.
//
// The upload queue (uploadQueue.util.js) keeps its items in module state, which dies
// with the tab. A shot the shutter already took is not something the user can retake,
// so every capture is written here the moment it is queued and only removed once the
// attachment row exists on the server. On the next visit the queue reads this store
// back and finishes the job.
//
// IndexedDB rather than the localStorage the rest of the app uses, because this holds
// Blobs — localStorage would mean base64, a ~33% size penalty and a 5MB ceiling that a
// single full-resolution photo can blow through on its own.

const DB_NAME = "24snaps";
const DB_VERSION = 1;
const STORE = "pendingUploads";

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB blocked"));
  }).catch((error) => {
    // A rejected promise would be retried on every call and log on every miss; a
    // resolved null makes "no store available" the steady state instead.
    console.warn("Capture store unavailable, uploads won't survive a reload:", error);
    return null;
  });

  return dbPromise;
}

function run(mode, operation) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        if (!db) {
          resolve(undefined);
          return;
        }

        const transaction = db.transaction(STORE, mode);
        const request = operation(transaction.objectStore(STORE));

        transaction.onabort = () => reject(transaction.error);
        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => resolve(request?.result);
      }),
  );
}

// Private browsing, a full disk or a locked profile all surface here. None of them are
// worth failing a capture over — the upload still runs, it just can't survive a reload.
function tolerate(promise) {
  return promise.catch((error) => {
    console.warn("Capture store write failed:", error);
    return undefined;
  });
}

// Writes (or overwrites) one capture. Called on queue, and again whenever a field
// worth resuming from changes — notably `storageKey`, so a capture whose bytes already
// reached storage is never uploaded twice.
export function saveCapture(record) {
  return tolerate(run("readwrite", (store) => store.put(record)));
}

// The upload landed (or the user gave up on it). Either way the bytes are no longer
// ours to keep.
export function deleteCapture(id) {
  return tolerate(run("readwrite", (store) => store.delete(id)));
}

export function listCaptures() {
  return tolerate(run("readonly", (store) => store.getAll())).then(
    (records) => records || [],
  );
}
