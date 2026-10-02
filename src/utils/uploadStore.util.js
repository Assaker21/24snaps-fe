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
//
// Every record carries the `userId` it was captured as. This browser is shared — a
// guest session, then a sign-in, maybe a second account later — and a pending capture
// belongs to exactly one of those people: it is their shot, it counts against their
// frames, and its storage key is signed for their id and nobody else's. Reading the
// store is therefore always scoped to one user (see queueFor below), so signing in as
// someone else can neither upload nor see what the previous user left behind.

const DB_NAME = "24snaps";
// v2 adds the userId index. Records written by v1 have no userId at all; the queue
// adopts those into whoever is signed in when it first sees them, since there was only
// ever one user's worth of them.
const DB_VERSION = 2;
const STORE = "pendingUploads";
const USER_INDEX = "userId";

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
      const db = request.result;
      const store = db.objectStoreNames.contains(STORE)
        ? request.transaction.objectStore(STORE)
        : db.createObjectStore(STORE, { keyPath: "id" });

      if (!store.indexNames.contains(USER_INDEX)) {
        store.createIndex(USER_INDEX, "userId");
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

// One user's unfinished captures. The index does the scoping, so another account's
// pending shots are never even read, let alone resumed.
export function listCaptures(userId) {
  if (userId == null) return Promise.resolve([]);

  return tolerate(
    run("readonly", (store) =>
      store.index(USER_INDEX).getAll(IDBKeyRange.only(userId)),
    ),
  ).then((records) => records || []);
}

// Records with no owner: everything written before this store knew about users, plus
// anything whose owner was lost. Only ever claimed deliberately, by the queue.
export function listUnownedCaptures() {
  return tolerate(run("readonly", (store) => store.getAll())).then((records) =>
    (records || []).filter((record) => record.userId == null),
  );
}

// Moves captures onto a different user — the one case being a guest whose account the
// backend has just merged into a real one, so the shots are the same person's but now
// answer to a new id. The storage key goes with the old owner: keys are signed per
// uploader and the API refuses one that doesn't name the caller, so the bytes have to
// go up again under a key the new owner owns.
export function reassignCaptures(records, userId) {
  if (!records.length) return Promise.resolve();

  return tolerate(
    run("readwrite", (store) => {
      records.forEach((record) => {
        store.put({ ...record, userId, storageKey: null });
      });
    }),
  );
}
