import { Link } from "react-router";
import attachmentsService from "../../../../../services/attachments.service";
import cn from "../../../../../utils/cn.util";
import { formatDateRange } from "../../../../../utils/dateRange.util";
import { encodeId } from "../../../../../utils/idCodec.util";

// How many tiles the strip lays out. The API sends at most this many rows on
// `previewAttachments`; the rest of the album is what the last tile counts.
const TILE_COUNT = 4;

// The scattered-prints look of the reference: each tile sits a degree or two off
// square and laps over the one before it, so the strip reads as a handful of photos
// dropped on the page rather than a grid.
const ANGLES = [-2.5, 1.5, -1.5, 2];

// Whichever version this caller may actually see. Before an album reveals, the server
// hands ordinary participants nothing but `blur` — an absent `thumb` means the sharp
// request would 403, so falling back is the gate working, not a missing image.
function tileSrc(attachment) {
  return (
    attachmentsService.getSrc(attachment, "thumb") ||
    attachmentsService.getSrc(attachment, "blur")
  );
}

// One finished event: serif title and its date span on one line, then the first few
// photos taken. `me.jpeg` — the design's ALBUMS section.
export default function AlbumRow({ event }) {
  const previews = (event.previewAttachments || []).slice(0, TILE_COUNT);
  const total = event.attachments?.length ?? 0;
  // Only what the strip couldn't fit. The count is the API's own visible total, so it
  // already excludes photos this viewer isn't shown.
  const remaining = Math.max(total - previews.length, 0);

  return (
    <Link to={`/events/${encodeId(event.id)}`} className="group block">
      <div className="flex flex-row items-baseline gap-3">
        <h3 className="font-serif text-2xl truncate min-w-0">
          {event.name || "Untitled event"}
        </h3>
        <span className="ml-auto shrink-0 text-sm text-muted-foreground">
          {formatDateRange(event.startAt, event.endAt)}
        </span>
      </div>

      {previews.length === 0 ? (
        <div className="mt-3.5 h-24 rounded-2xl bg-surface flex items-center justify-center">
          <span className="text-sm text-subtle">No photos in this album</span>
        </div>
      ) : (
        <div className="mt-3.5 flex flex-row items-center -mr-9">
          {previews.map((attachment, index) => (
            <div
              key={attachment.id}
              style={{
                transform: `rotate(${ANGLES[index % ANGLES.length]}deg)`,
              }}
              className={cn(
                "relative w-1/4 shrink-0 aspect-[3/4] rounded-2xl overflow-hidden",
                "bg-surface ring-1 ring-black/5 shadow-[0_8px_20px_rgba(0,0,0,0.12)]",
                "transition-transform duration-300 group-hover:-translate-y-0.5",
                index > 0 && "-ml-3",
              )}
            >
              <img
                src={tileSrc(attachment)}
                alt=""
                loading="lazy"
                decoding="async"
                className={cn(
                  "w-full h-full object-cover",
                  // The blurred variant is soft to its very edge; scaling it hides
                  // the halo the crop would otherwise leave around the tile.
                  !attachment.urls?.thumb && "scale-110",
                )}
              />

              {/* The overflow count rides the last tile, exactly as in the reference. */}
              {remaining > 0 && index === previews.length - 1 ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white text-2xl font-sans font-medium">
                  +{remaining}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
