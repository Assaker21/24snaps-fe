import { useEffect, useRef, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  XIcon,
} from "lucide-react";
import attachmentsService from "../services/attachments.service";
import IconButton from "./IconButton.component";
import Button from "./Button.component";
import cn from "../utils/cn.util";

function extensionFromContentType(contentType) {
  return (contentType?.split("/")[1] || "jpg").split("+")[0];
}

// Full-screen inspector for one attachment out of a list, shared by the event grid and
// the camera's gallery so both behave the same: open on the already-cached thumb,
// upgrade to full size once it decodes, step with arrows/keys/swipe, download.
export default function PhotoViewer({
  attachments,
  index,
  onIndexChange,
  onClose,
  currentUserId,
  fileNamePrefix = "moment",
}) {
  const attachment = attachments?.[index];
  // Keyed by attachment id: a src for a photo we've already stepped past must never
  // be shown for the one now on screen.
  const [fullLoaded, setFullLoaded] = useState({});
  const [downloading, setDownloading] = useState(false);
  const touchStartRef = useRef(null);

  const count = attachments?.length ?? 0;
  const hasPrevious = index > 0;
  const hasNext = index < count - 1;

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      if (e.key === "ArrowRight" && index < count - 1) onIndexChange(index + 1);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, count, onClose, onIndexChange]);

  // The browser decodes neighbours while the user is looking at this one, so stepping
  // through a film feels instant instead of flashing a blank frame each time.
  useEffect(() => {
    [index - 1, index + 1].forEach((neighbour) => {
      const src = attachmentsService.getSrc(attachments?.[neighbour], "thumb");
      if (src) new Image().src = src;
    });
  }, [attachments, index]);

  if (!attachment) return null;

  const thumbSrc = attachmentsService.getSrc(attachment, "thumb");
  const fullSrc = attachmentsService.getSrc(attachment, "full");
  const src = fullLoaded[attachment.id] ? fullSrc : thumbSrc || fullSrc;

  async function handleDownload() {
    // Downloads always take the full size: the untouched original on paid events,
    // the lightly compressed version otherwise.
    if (!fullSrc) return;

    setDownloading(true);
    try {
      const blob = await fetch(fullSrc).then((r) => r.blob());
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${fileNamePrefix}-${attachment.id}.${extensionFromContentType(blob.type)}`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // CORS/network hiccup fetching the blob — fall back to a plain navigation
      // so the user can still save the image manually.
      window.open(fullSrc, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  function handleTouchStart(e) {
    touchStartRef.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (start == null) return;

    const delta = (e.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(delta) < 50) return;

    if (delta < 0 && hasNext) onIndexChange(index + 1);
    if (delta > 0 && hasPrevious) onIndexChange(index - 1);
  }

  const who =
    attachment.userId === currentUserId
      ? "You"
      : attachment.user?.firstName || "";

  return (
    <div
      className="fixed inset-0 z-270 bg-black/95 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex flex-row items-center justify-between p-4 shrink-0">
        <span className="text-white/70 text-sm tabular-nums">
          {index + 1} / {count}
        </span>
        <IconButton variant="overlay" onClick={onClose} aria-label="Close">
          <XIcon size={20} />
        </IconButton>
      </div>

      <div className="flex-1 min-h-0 relative flex items-center justify-center px-4">
        <img
          src={src}
          alt=""
          className="max-w-full max-h-full object-contain rounded-2xl"
        />

        {/* Decodes the full size off-screen; the visible <img> swaps to it only once
            it is ready, so the thumb shows instantly with no flash. */}
        {fullSrc && fullSrc !== src ? (
          <img
            src={fullSrc}
            alt=""
            aria-hidden
            className="hidden"
            onLoad={() =>
              setFullLoaded((loaded) => ({ ...loaded, [attachment.id]: true }))
            }
          />
        ) : null}

        {[
          { show: hasPrevious, to: index - 1, side: "left", Icon: ChevronLeftIcon },
          { show: hasNext, to: index + 1, side: "right", Icon: ChevronRightIcon },
        ].map(({ show, to, side, Icon }) =>
          show ? (
            <button
              key={side}
              type="button"
              onClick={() => onIndexChange(to)}
              aria-label={side === "left" ? "Previous photo" : "Next photo"}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 size-11 rounded-full cursor-pointer",
                "bg-white/10 backdrop-blur-sm text-white flex items-center justify-center",
                "transition-transform active:scale-90",
                side === "left" ? "left-2" : "right-2",
              )}
            >
              <Icon size={22} />
            </button>
          ) : null,
        )}
      </div>

      <div className="flex flex-row items-center justify-between gap-4 p-4 shrink-0">
        <span className="font-serif italic text-white text-xl truncate">
          {who}
        </span>
        <Button
          variant="primary"
          onClick={handleDownload}
          disabled={downloading}
          className="bg-white text-foreground shrink-0"
        >
          <DownloadIcon size={16} />
          {downloading ? "Downloading…" : "Download"}
        </Button>
      </div>
    </div>
  );
}
