import { useState } from "react";
import { Link } from "react-router";
import { PlusIcon } from "lucide-react";
import eventsService from "../../../../services/events.service";
import Button from "../../../../components/Button.component";
import LoadingScreen from "../../../../components/LoadingScreen.component";
import SectionLabel from "../../../../components/SectionLabel.component";
import TopBar from "../../../../components/TopBar.component";
import { formatCountdown } from "../../../../utils/countdown.util";
import { getCoverSrc } from "../../../../utils/cover.util";
import { encodeId } from "../../../../utils/idCodec.util";
import useEffectOnce from "../../../../hooks/useEffectOnce.hook";

function EventRow({ event }) {
  // Falls back to the shipped default, so a row is never a blank grey square.
  const coverSrc = getCoverSrc(event);

  return (
    <Link
      to={`/events/${encodeId(event.id)}`}
      className="flex flex-row items-center gap-3.5 bg-surface rounded-2xl p-3 transition-colors hover:bg-surface-strong"
    >
      <div
        className="size-14 rounded-xl bg-surface-strong bg-cover bg-center shrink-0"
        style={{ backgroundImage: `url(${coverSrc})` }}
      />
      <div className="flex flex-col min-w-0">
        <span className="font-serif text-xl truncate">
          {event.name || "Untitled event"}
        </span>
        <span className="text-xs text-muted-foreground mt-1">
          {formatCountdown(event.endAt)} · {event.attachments?.length ?? 0}{" "}
          moments
        </span>
      </div>
    </Link>
  );
}

export default function EventsListPage() {
  // Split at fetch time rather than during render — "has this event ended yet"
  // depends on the clock, which can't be read while rendering. Ended events are the
  // albums section.
  const [events, setEvents] = useState(null);

  useEffectOnce(load);

  async function load() {
    const response = await eventsService.getMultiple();
    if (!response.ok) return;

    const now = Date.now();
    setEvents({
      active: response.data.filter(
        (event) => !event.endAt || new Date(event.endAt).getTime() > now,
      ),
      albums: response.data.filter(
        (event) => event.endAt && new Date(event.endAt).getTime() <= now,
      ),
    });
  }

  const active = events?.active ?? [];
  const albums = events?.albums ?? [];

  return (
    <div className="w-full min-h-dvh flex flex-col pb-10">
      {/* The same bar the landing page wears — only the actions differ. */}
      <TopBar
        actions={
          <Link to="/events/create">
            <Button variant="primary" size="sm">
              <PlusIcon size={16} />
              New
            </Button>
          </Link>
        }
      />

      <div className="px-4 pt-4">
        <SectionLabel>Active</SectionLabel>

        {events === null ? (
          <LoadingScreen variant="inline" message="Finding your events…" />
        ) : active.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <span className="size-8 rounded-full bg-surface-strong" />
            <p className="text-sm text-muted-foreground">No active events</p>
            <Link to="/events/create">
              <Button variant="brand">
                <PlusIcon size={16} />
                Create event
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-4">
            {active.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {albums.length > 0 ? (
        <div className="px-4 pt-8 mt-4 border-t border-border">
          <SectionLabel>Albums</SectionLabel>
          <div className="flex flex-col gap-3 mt-4">
            {albums.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
