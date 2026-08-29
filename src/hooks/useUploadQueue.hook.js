import { useEffect, useRef, useSyncExternalStore } from "react";
import uploadQueue from "../utils/uploadQueue.util";

// Subscribes a component to the module-level upload queue, scoped to one event.
//
// The queue outlives the component on purpose (see uploadQueue.util.js), so this hook
// only reads it — mounting or unmounting never starts, pauses, or cancels an upload.
// `onSuccess` fires per landed upload, which is how a caller keeps a local "uploaded so
// far" count in step: finished items leave the queue immediately.
export default function useUploadQueue({ eventId, onSuccess } = {}) {
  // Held in a ref so an inline `onSuccess` doesn't tear down and rebuild the
  // subscription on every render.
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  const allItems = useSyncExternalStore(
    uploadQueue.subscribe,
    uploadQueue.getItems,
  );

  useEffect(() => {
    return uploadQueue.subscribe((_items, event) => {
      if (event?.type !== "success") return;
      if (eventId != null && event.eventId !== eventId) return;
      onSuccessRef.current?.(event);
    });
  }, [eventId]);

  const items =
    eventId == null
      ? allItems
      : allItems.filter((item) => item.eventId === eventId);

  const failed = items.filter((item) => item.status === "failed");
  const inFlight = items.filter((item) => item.status !== "failed");

  return {
    items,
    // Only what the server is still on course to receive. A parked failure is
    // deliberately *not* counted: a shot that didn't upload hasn't been spent, so the
    // frame goes back to the user rather than being silently charged for a photo that
    // isn't there. The capture itself is kept and retried regardless, and the backend
    // enforces the real per-user limit, so a late retry landing can't overshoot.
    outstandingCount: inFlight.length,
    uploadingCount: inFlight.length,
    failedCount: failed.length,
    enqueue: (capture) => uploadQueue.enqueue({ eventId, ...capture }),
    retryFailed: () => uploadQueue.retryAllFailed(eventId),
    discardFailed: () => uploadQueue.discardFailed(eventId),
  };
}
