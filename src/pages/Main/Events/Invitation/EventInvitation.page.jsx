import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import {
  ApertureIcon,
  ArrowRightIcon,
  ClockIcon,
  PencilIcon,
  UserRoundIcon,
} from "lucide-react";
import eventsService from "../../../../services/events.service";
import usersService from "../../../../services/users.service";
import Button from "../../../../components/Button.component";
import Input from "../../../../components/Input.component";
import LoadingScreen from "../../../../components/LoadingScreen.component";
import { useAuth } from "../../../../contexts/Auth.context";
import { encodeId, decodeId } from "../../../../utils/idCodec.util";
import { formatCountdown } from "../../../../utils/countdown.util";
import { getCoverSrc } from "../../../../utils/cover.util";
import cn from "../../../../utils/cn.util";

export default function EventInvitationPage() {
  const { eventId: encodedEventId } = useParams();
  const eventId = decodeId(encodedEventId);
  const navigate = useNavigate();
  const { user, setUser, loading: authLoading } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading) load();
  }, [eventId, authLoading]);

  // The invitation endpoint is the only one that describes an event to someone who
  // isn't in it — the full payload is 403 until you have joined.
  async function load() {
    setLoading(true);
    const response = await eventsService.getInvitation(eventId);
    setEvent(response.ok ? response.data : null);
    setLoading(false);
  }

  // This route is only for new joiners — existing creators/participants land
  // on the real event page instead.
  useEffect(() => {
    if (event?.isMember) {
      navigate(`/events/${encodeId(eventId)}`, { replace: true });
    }
  }, [event, eventId, navigate]);

  async function handleJoin() {
    setJoining(true);
    setError(null);

    if (name.trim()) {
      await usersService.update(user.id, { firstName: name.trim() });
      setUser((u) => ({ ...u, firstName: name.trim() }));
    }

    // The server decides membership: it re-checks that the event is live, activated
    // and has room before it lets anyone in.
    const response = await eventsService.join(eventId);

    if (!response.ok) {
      setError(
        response.data?.message || "Couldn't join this event, try again.",
      );
      setJoining(false);
      return;
    }

    navigate(`/events/${encodeId(eventId)}/camera`);
  }

  if (authLoading || loading || !user || event?.isMember) {
    return <LoadingScreen message="Unwrapping your invitation…" />;
  }

  if (!event) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className="font-serif text-3xl">Nothing here</h1>
        <p className="text-sm text-muted-foreground">
          This event doesn't exist or was deleted.
        </p>
        <Link to="/events">
          <Button variant="primary">Back to events</Button>
        </Link>
      </div>
    );
  }

  // Always a photo: an event whose host never chose a cover falls back to the shipped
  // default, which is a static asset — nothing about it is ever stored on the event.
  const coverSrc = getCoverSrc(event);
  const shots =
    event.maxAttachmentsPerUser == null
      ? "Unlimited shots"
      : `${event.maxAttachmentsPerUser} shots available`;

  // The three reasons the door is shut. The server refuses the join in each case, so
  // this only decides what the card says instead of offering a name field.
  const closed = !event.activated
    ? "This event hasn't been activated by its host yet."
    : event.ended
      ? "This event has ended, so its camera is closed."
      : event.full
        ? "This event is full — every spot has been taken."
        : null;

  // The invitation card is the reference's full-bleed cover with everything
  // stacked over the bottom of the photo.
  return (
    <div
      className="min-h-dvh flex flex-col justify-end bg-foreground bg-cover bg-center"
      style={{ backgroundImage: `url(${coverSrc})` }}
    >
      <div className="fixed inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

      <div className="relative flex flex-col items-center text-center px-6 pb-10 pt-16 gap-3 text-white">
        <span className="flex flex-row items-center gap-1.5 text-xs rounded-full px-3 py-1.5 bg-white/20 backdrop-blur-sm">
          <UserRoundIcon size={12} />
          Invited by {event.creator?.firstName || "the host"}
        </span>

        <h1 className="font-serif text-4xl max-w-80">{event.name}</h1>

        <div className="flex flex-row items-center gap-4 text-xs text-white/80">
          <span className="flex flex-row items-center gap-1.5">
            <ClockIcon size={12} />
            {formatCountdown(event.endAt) || "Ended"}
          </span>
          <span className="flex flex-row items-center gap-1.5">
            <ApertureIcon size={12} />
            {shots}
          </span>
        </div>

        {closed ? (
          <div className="w-full max-w-sm flex flex-col gap-3 mt-5">
            <p className="text-sm text-white/85 leading-snug">{closed}</p>
            <Link to="/events">
              <Button
                variant="primary"
                className="w-full justify-center bg-white/85 text-foreground hover:brightness-105"
              >
                Back to your events
              </Button>
            </Link>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-2.5 mt-5">
            <Input
              icon={<PencilIcon size={16} />}
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(
                "bg-white/15 backdrop-blur-sm text-white placeholder:text-white/60",
              )}
            />
            <Button
              variant="primary"
              onClick={handleJoin}
              disabled={joining}
              className="w-full justify-center bg-white/85 text-foreground hover:brightness-105"
            >
              {joining ? "Joining…" : "Take your camera"}
              <ArrowRightIcon size={16} />
            </Button>

            {error ? (
              <p className="text-sm text-white/90 bg-danger/70 rounded-2xl px-4 py-2.5" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
