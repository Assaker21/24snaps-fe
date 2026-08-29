import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ClockIcon, ImageIcon, UsersIcon } from "lucide-react";
import shareService from "../../services/share.service";
import Button from "../../components/Button.component";
import LoadingScreen from "../../components/LoadingScreen.component";
import PhotoGrid from "../../components/PhotoGrid.component";
import PhotoViewer from "../../components/PhotoViewer.component";
import SectionLabel from "../../components/SectionLabel.component";
import { getCoverSrc } from "../../utils/cover.util";
import { formatDateRange } from "../../utils/dateRange.util";
import { decodeId } from "../../utils/idCodec.util";

// The published album. Deliberately outside the app's provider tree: no auth context,
// no device id, no session of any kind — someone opening this link is a visitor, and
// the link in the URL is the only thing that has to be true for the page to render.
//
// It borrows the event screen's cover hero and the same PhotoGrid/PhotoViewer pair the
// signed-in album uses, so a shared album looks like the album it came from rather
// than a second design.
export default function SharedAlbumPage() {
  const { shareId } = useParams();

  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewerIndex, setViewerIndex] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // The code in the URL is the link's number under the app's id codec, exactly as
      // an event id is. A malformed one throws rather than returning null, and a
      // stranger mistyping a link is an ordinary case here, not a crash.
      let publicId;
      try {
        publicId = decodeId(shareId);
      } catch {
        if (!cancelled) {
          setAlbum(null);
          setLoading(false);
        }
        return;
      }

      const response = await shareService.getSingle(publicId);
      if (cancelled) return;

      setAlbum(response.ok ? response.data : null);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  if (loading) return <LoadingScreen message="Opening the album…" />;

  if (!album) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className="font-serif text-3xl">This link has closed</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          The album it pointed at is no longer being shared. Ask whoever sent it
          for a fresh link.
        </p>
        <Link to="/">
          <Button variant="primary">Make your own album</Button>
        </Link>
      </div>
    );
  }

  const { event, attachments = [] } = album;
  const coverSrc = getCoverSrc(event);
  const dates = formatDateRange(event.startAt, event.endAt);
  // The server decides this per photo and hands out nothing but `blur` until it
  // passes; the banner is a label on a gate that has already been applied.
  const revealed =
    attachments.length === 0 || attachments.some((a) => a.revealed);

  const stats = [
    { value: attachments.length, label: "Moments", Icon: ImageIcon },
    { value: event.peopleCount ?? 1, label: "People", Icon: UsersIcon },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Its own chrome rather than TopBar: that bar reads the auth context, and there
          isn't one here. A visitor gets the wordmark and an invitation of their own. */}
      <div className="w-full flex flex-row justify-between items-center gap-2 px-4 py-3 shrink-0 bg-background/90 backdrop-blur-md sticky top-0 z-200">
        <Link to="/" aria-label="souwar helwe home">
          <img
            src="/logo.jpg"
            alt="souwar helwe"
            className="size-14 -my-2 object-contain"
          />
        </Link>

        <Link to="/">
          <Button variant="secondary" size="sm">
            Make your own
          </Button>
        </Link>
      </div>

      {/* The event screen's hero, kept intact — an album someone shared should look
          like the album its host has been looking at all along. */}
      <div
        className="relative w-full min-h-[26rem] bg-surface-strong bg-cover bg-center shrink-0"
        style={{ backgroundImage: `url(${coverSrc})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />

        <div className="absolute inset-x-0 bottom-0 px-5 pt-16 pb-7 flex flex-col items-center text-center text-white">
          {event.host?.firstName ? (
            <SectionLabel className="text-white/70">
              An album by {event.host.firstName}
            </SectionLabel>
          ) : null}

          <h1 className="font-serif text-4xl mt-3">{event.name}</h1>

          {dates ? (
            <p className="text-sm text-white/75 mt-2.5">{dates}</p>
          ) : null}

          <div className="flex flex-row items-start justify-center gap-12 w-full max-w-sm mt-6">
            {stats.map(({ value, label, Icon }) => (
              <div key={label} className="flex flex-col items-center">
                <span className="font-serif italic text-2xl">{value}</span>
                <span className="flex flex-row items-center gap-1.5 text-xs mt-1 text-white/75">
                  <Icon size={12} />
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {event.description ? (
        <p className="px-5 pt-6 text-center text-muted-foreground leading-relaxed max-w-xl mx-auto">
          {event.description}
        </p>
      ) : null}

      <div className="px-4 pt-7 pb-14 max-w-5xl w-full mx-auto">
        <SectionLabel>The album</SectionLabel>

        {!revealed ? (
          <div className="flex justify-center mt-5">
            <span className="flex flex-row items-center gap-2 bg-surface text-muted-foreground text-xs rounded-full px-4 py-2 whitespace-nowrap">
              <ClockIcon size={13} />
              Reveals on{" "}
              {event.revealAt
                ? new Date(event.revealAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "soon"}
            </span>
          </div>
        ) : null}

        {attachments.length === 0 ? (
          <p className="text-sm text-subtle text-center mt-12">
            No moments were captured at this one.
          </p>
        ) : (
          // The grid widens past the app's two columns here: a shared link is as
          // likely to be opened on a laptop as on the phone that shot it.
          <PhotoGrid
            attachments={attachments}
            onOpen={setViewerIndex}
            className="mt-5 sm:grid-cols-3 lg:grid-cols-4"
          />
        )}
      </div>

      <div className="mt-auto border-t border-border px-5 py-8 flex flex-col items-center gap-3 text-center">
        <p className="font-serif text-2xl">Your turn.</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Hand everyone a camera at your next event and see the night through
          their eyes.
        </p>
        <Link to="/" className="mt-1">
          <Button variant="primary">Create an event</Button>
        </Link>
      </div>

      {viewerIndex != null ? (
        <PhotoViewer
          attachments={attachments}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          fileNamePrefix={event.name || "moment"}
        />
      ) : null}
    </div>
  );
}
