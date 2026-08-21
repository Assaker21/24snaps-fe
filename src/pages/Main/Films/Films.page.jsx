import { useState } from "react";
import { Link } from "react-router";
import {
  CircleUserRoundIcon,
  DiscIcon,
  FilmIcon,
  PlusIcon,
  ScanLineIcon,
} from "lucide-react";
import eventsService from "../../../services/events.service";
import attachmentsService from "../../../services/attachments.service";
import Button from "../../../components/Button.component";
import SectionLabel from "../../../components/SectionLabel.component";
import { formatCountdown } from "../../../utils/countdown.util";
import { encodeId } from "../../../utils/idCodec.util";
import { useAuth } from "../../../contexts/Auth.context";
import cn from "../../../utils/cn.util";
import useEffectOnce from "../../../hooks/useEffectOnce.hook";

function FilmRow({ event }) {
  const coverSrc = attachmentsService.getSrc(event.mainAttachment, "cover");

  return (
    <Link
      to={`/events/${encodeId(event.id)}`}
      className="flex flex-row items-center gap-3.5 bg-surface rounded-2xl p-3 transition-colors hover:bg-surface-strong"
    >
      <div
        className="size-14 rounded-xl bg-surface-strong bg-cover bg-center shrink-0"
        style={coverSrc ? { backgroundImage: `url(${coverSrc})` } : undefined}
      />
      <div className="flex flex-col min-w-0">
        <span className="font-serif text-xl truncate">
          {event.name || "Untitled film"}
        </span>
        <span className="text-xs text-muted-foreground mt-1">
          {formatCountdown(event.endAt)} · {event.attachments?.length ?? 0}{" "}
          moments
        </span>
      </div>
    </Link>
  );
}

export default function FilmsPage() {
  // Split at fetch time rather than during render — "has this film ended yet"
  // depends on the clock, which can't be read while rendering.
  const [films, setFilms] = useState(null);
  const { user, isGuest, setOpen } = useAuth();

  useEffectOnce(load);

  async function load() {
    const response = await eventsService.getMultiple();
    if (!response.ok) return;

    const now = Date.now();
    setFilms({
      active: response.data.filter(
        (event) => !event.endAt || new Date(event.endAt).getTime() > now,
      ),
      albums: response.data.filter(
        (event) => event.endAt && new Date(event.endAt).getTime() <= now,
      ),
    });
  }

  const active = films?.active ?? [];
  const albums = films?.albums ?? [];

  return (
    <div className="w-full min-h-dvh flex flex-col pb-24">
      {/* Top bar: wordmark left, join + new right — as in the reference. */}
      <div className="flex flex-row items-center justify-between px-4 py-3 sticky top-0 bg-background z-10">
        <Link to="/" aria-label="24snaps home">
          <img
            src="/logo.jpg"
            alt="24snaps"
            className="size-14 -my-2 object-contain"
          />
        </Link>

        <div className="flex flex-row items-center gap-2">
          <Button variant="secondary" size="sm">
            <ScanLineIcon size={16} />
            Join
          </Button>
          <Link to="/events/create">
            <Button variant="primary" size="sm">
              <PlusIcon size={16} />
              New
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-4 pt-4">
        <SectionLabel>Active</SectionLabel>

        {films === null ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            Loading…
          </p>
        ) : active.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <span className="size-8 rounded-full bg-surface-strong" />
            <p className="text-sm text-muted-foreground">No active films</p>
            <Link to="/events/create">
              <Button variant="brand">
                <PlusIcon size={16} />
                Create film
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-4">
            {active.map((event) => (
              <FilmRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {albums.length > 0 ? (
        <div className="px-4 pt-8 mt-4 border-t border-border">
          <SectionLabel>Albums</SectionLabel>
          <div className="flex flex-col gap-3 mt-4">
            {albums.map((event) => (
              <FilmRow key={event.id} event={event} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Bottom tab bar. Tapes isn't built yet, so it reads as a disabled peer
          rather than a link that goes nowhere. */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-3 flex flex-row items-center justify-between">
        <div className="flex flex-row items-center gap-7">
          <span className="flex flex-row items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em]">
            <FilmIcon size={18} />
            Films
          </span>
          <span
            className="flex flex-row items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-subtle"
            title="Coming soon"
          >
            <DiscIcon size={18} />
            Tapes
          </span>
        </div>

        <button
          type="button"
          onClick={() => isGuest && setOpen(true)}
          className={cn(
            "flex flex-row items-center gap-2 text-sm cursor-pointer",
            isGuest ? "text-muted-foreground" : "text-foreground",
          )}
        >
          <CircleUserRoundIcon size={22} />
          {!isGuest && user?.firstName ? user.firstName : null}
        </button>
      </nav>
    </div>
  );
}
