import { useEffect, useState } from "react";
import { Link } from "react-router";
import { PlusIcon, ScanLineIcon } from "lucide-react";
import eventsService from "../../../services/events.service";
import attachmentsService from "../../../services/attachments.service";
import Button from "../../../components/Button.component";
import { formatCountdown } from "../../../utils/countdown.util";

export default function FilmsPage() {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const response = await eventsService.getMultiple();
    if (response.ok) {
      setEvents(response.data);
    }
  }

  return (
    <div className="w-full min-h-dvh pt-24 px-4 pb-10">
      <div className="flex flex-row items-center justify-between mb-8">
        <h1 className="font-serif font-bold text-2xl">Films</h1>
        <Link to="/events/create">
          <Button variant="primary" className="text-sm">
            <PlusIcon size={16} />
            Create film
          </Button>
        </Link>
      </div>

      <p className="uppercase tracking-wider text-sm text-gray-500 mb-3">
        Active
      </p>

      {events === null ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <ScanLineIcon size={32} className="text-gray-300" />
          <p className="text-sm text-gray-500">No films yet</p>
          <Link to="/events/create">
            <Button variant="primary">
              <PlusIcon size={16} />
              Create film
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="flex flex-row items-center gap-3 bg-gray-100 border border-gray-200 rounded-2xl p-3"
            >
              <div
                className="size-14 rounded-xl bg-gray-300 bg-cover bg-center shrink-0"
                style={
                  event.mainAttachment?.downloadUrl
                    ? {
                        backgroundImage: `url(${attachmentsService.getDownloadSrc(event.mainAttachment)})`,
                      }
                    : undefined
                }
              />
              <div className="flex flex-col">
                <span className="font-serif text-lg leading-tight">
                  {event.name || "Untitled film"}
                </span>
                <span className="text-xs text-gray-500">
                  {formatCountdown(event.endAt)} · {event.attachments?.length ?? 0}{" "}
                  moments
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
