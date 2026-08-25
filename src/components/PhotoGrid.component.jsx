import { EyeOffIcon } from "lucide-react";
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

// The tile grid shared by the event page and the camera's gallery. The blurring is
// server-side, so there is no sharp version in the browser to peek at; the scale-110
// only hides the blurred variant's soft edges.
//
// A hidden photo only ever reaches the host — the API drops it from everyone else's
// payload — so the badge below needs no permission check of its own.
export default function PhotoGrid({
  attachments,
  currentUserId,
  onOpen,
  className,
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5", className)}>
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
