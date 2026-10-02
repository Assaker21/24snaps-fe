import { useEffect, useState } from "react";
import { EyeOffIcon, LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";
import attachmentsService from "../services/attachments.service";
import cn from "../utils/cn.util";

// Whether this caller may see the sharp version. The server already decided that when
// it built `urls` — before an event reveals it hands ordinary participants nothing but
// `blur`, while the uploader and the creator still get `thumb`. Reading it per
// attachment rather than off a single event-level flag is what lets you review your own
// shots straight after taking them.
function isSharp(attachment) {
  return Boolean(attachment?.urls?.thumb);
}

// One capture still on its way to the server, drawn from the blob the queue is holding.
// A shot exists the moment the shutter closes — waiting for the upload to land before
// showing it made the roll look like it had lost the photo, which is precisely the
// moment the user is least willing to believe it hasn't.
function PendingTile({ item }) {
  // Made during the first render rather than in an effect, so the tile paints the photo
  // immediately instead of a blank square for one frame. The tile is keyed by item id
  // and an item's blob never changes, so one URL lasts its whole life.
  const [src] = useState(() =>
    item.blob ? URL.createObjectURL(item.blob) : null,
  );

  // Released when the tile goes — which is the upload landing (the item leaves the
  // queue) as often as it is the grid closing.
  useEffect(() => {
    if (!src) return undefined;
    return () => URL.revokeObjectURL(src);
  }, [src]);

  const failed = item.status === "failed";

  return (
    <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface">
      {src ? (
        <img
          src={src}
          alt=""
          decoding="async"
          className={cn(
            "w-full h-full object-cover",
            // Visibly not-yet-landed, without hiding what was shot.
            failed ? "opacity-50" : "opacity-70",
          )}
        />
      ) : null}

      <span
        className={cn(
          "absolute top-2.5 left-2.5 flex flex-row items-center gap-1.5 rounded-full",
          "backdrop-blur-sm text-white text-[0.7rem] px-2.5 py-1 pointer-events-none",
          failed ? "bg-danger/85" : "bg-black/65",
        )}
      >
        {failed ? (
          <>
            <TriangleAlertIcon size={12} />
            Not uploaded
          </>
        ) : (
          <>
            <LoaderCircleIcon size={12} className="animate-spin" />
            Uploading
          </>
        )}
      </span>
    </div>
  );
}

// The tile grid shared by the event page and the camera's gallery. The blurring is
// server-side, so there is no sharp version in the browser to peek at; the scale-110
// only hides the blurred variant's soft edges.
//
// A hidden photo only ever reaches the host — the API drops it from everyone else's
// payload — so the badge below needs no permission check of its own.
//
// `pending` is the upload queue's own items for this event. They lead the grid because
// they are the most recent thing that happened, and they carry no index into
// `attachments` — tapping one would have nothing to open.
export default function PhotoGrid({
  attachments,
  pending = [],
  currentUserId,
  onOpen,
  className,
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5", className)}>
      {pending.map((item) => (
        <PendingTile key={item.id} item={item} />
      ))}

      {attachments.map((attachment, index) => {
        const sharp = isSharp(attachment);

        return (
          <div
            key={attachment.id}
            className="relative aspect-square rounded-2xl overflow-hidden bg-surface"
          >
            <button
              type="button"
              onClick={() => sharp && onOpen(index)}
              disabled={!sharp}
              className={cn("w-full h-full block", sharp && "cursor-pointer")}
            >
              <img
                src={attachmentsService.getSrc(
                  attachment,
                  sharp ? "thumb" : "blur",
                )}
                alt=""
                loading="lazy"
                decoding="async"
                className={cn(
                  "w-full h-full object-cover",
                  !sharp && "scale-110",
                  attachment.hidden && "opacity-45",
                )}
              />
            </button>

            {attachment.hidden ? (
              <span className="absolute top-2.5 left-2.5 flex flex-row items-center gap-1.5 rounded-full bg-black/65 backdrop-blur-sm text-white text-[0.7rem] px-2.5 py-1 pointer-events-none">
                <EyeOffIcon size={12} />
                Hidden
              </span>
            ) : null}

            {sharp ? (
              <span className="absolute bottom-2.5 left-3 font-serif italic text-white text-lg drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] pointer-events-none">
                {attachment.userId === currentUserId
                  ? "You"
                  : attachment.user?.firstName || ""}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
