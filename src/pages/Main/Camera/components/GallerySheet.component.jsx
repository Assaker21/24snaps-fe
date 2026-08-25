import { useCallback, useEffect, useState } from "react";
import { ClockIcon, ImageIcon, XIcon } from "lucide-react";
import PhotoGrid from "../../../../components/PhotoGrid.component";
import PhotoViewer from "../../../../components/PhotoViewer.component";
import IconButton from "../../../../components/IconButton.component";

// The camera's roll, shown over the viewfinder rather than by navigating away — the
// point of tapping the thumbnail is to glance at what you've shot and get straight back
// to shooting.
export default function GallerySheet({
  open,
  onClose,
  event,
  attachments,
  currentUserId,
  canHide = false,
  onToggleHidden,
}) {
  const [viewerIndex, setViewerIndex] = useState(null);

  // Reopening the roll should land on the grid, not on whatever photo was last
  // inspected — so every close path clears the viewer on the way out.
  const close = useCallback(() => {
    setViewerIndex(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    function handleKey(e) {
      if (e.key === "Escape" && viewerIndex == null) close();
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, viewerIndex, close]);

  if (!open) return null;

  const revealed = !event?.revealAt || new Date(event.revealAt) <= new Date();

  return (
    <div className="fixed inset-0 z-265 bg-background flex flex-col">
      <div className="flex flex-row items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shrink-0 border-b border-border">
        <div className="flex flex-col min-w-0">
          <span className="font-serif text-2xl truncate">
            {event?.name || "Your shots"}
          </span>
          <span className="text-sm text-muted-foreground">
            {attachments.length}{" "}
            {attachments.length === 1 ? "moment" : "moments"}
          </span>
        </div>

        <IconButton onClick={close} aria-label="Back to camera">
          <XIcon size={18} />
        </IconButton>
      </div>

      {/* min-h-0 is what makes the scroll real: a flex child defaults to min-height
          auto, so without it this column grows to fit every tile and overflow-y-auto
          never has anything to scroll. */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {!revealed && attachments.length > 0 ? (
          <div className="flex justify-center mb-5">
            <span className="flex flex-row items-center gap-2 bg-surface text-muted-foreground text-xs rounded-full px-4 py-2 whitespace-nowrap">
              <ClockIcon size={13} />
              Everyone sees these on{" "}
              {new Date(event.revealAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        ) : null}

        {attachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <ImageIcon size={28} className="text-subtle" />
            <p className="text-sm text-subtle">No moments captured yet.</p>
          </div>
        ) : (
          <PhotoGrid
            attachments={attachments}
            currentUserId={currentUserId}
            onOpen={setViewerIndex}
          />
        )}
      </div>

      {viewerIndex != null ? (
        <PhotoViewer
          attachments={attachments}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          currentUserId={currentUserId}
          fileNamePrefix={event?.name || "moment"}
          canHide={canHide}
          onToggleHidden={onToggleHidden}
        />
      ) : null}
    </div>
  );
}
