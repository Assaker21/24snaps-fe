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
import attachmentsService from "../../../../services/attachments.service";
import Button from "../../../../components/Button.component";
import Input from "../../../../components/Input.component";
import LoadingScreen from "../../../../components/LoadingScreen.component";
import { useAuth } from "../../../../contexts/Auth.context";
import { encodeId, decodeId } from "../../../../utils/idCodec.util";
import { formatCountdown } from "../../../../utils/countdown.util";
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

  useEffect(() => {
    if (!authLoading) load();
  }, [eventId, authLoading]);

  async function load() {
    setLoading(true);
    const response = await eventsService.getSingle(eventId);
    setEvent(response.ok ? response.data : null);
    setLoading(false);
  }

  const isCreator = event && user && event.creatorId === user.id;
  const isParticipant =
    event && user && event.participants?.some((p) => p.id === user.id);

  // This route is only for new joiners — existing creators/participants land
  // on the real event page instead.
  useEffect(() => {
    if (isCreator || isParticipant) {
      navigate(`/events/${encodeId(eventId)}`, { replace: true });
    }
  }, [isCreator, isParticipant, eventId, navigate]);

  async function handleJoin() {
    setJoining(true);
    if (name.trim()) {
      await usersService.update(user.id, { firstName: name.trim() });
      setUser((u) => ({ ...u, firstName: name.trim() }));
    }
    await eventsService.update(eventId, {
      participants: { connect: { id: user.id } },
    });
    navigate(`/events/${encodeId(eventId)}/camera`);
  }

  if (authLoading || loading || !user || isCreator || isParticipant) {
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

  const coverSrc = attachmentsService.getSrc(event.mainAttachment, "cover");
  const shots =
    event.maxAttachmentsPerUser == null
      ? "Unlimited shots"
      : `${event.maxAttachmentsPerUser} shots available`;

  // The invitation card is the reference's full-bleed cover with everything
  // stacked over the bottom of the photo.
  return (
    <div
      className={cn(
        "min-h-dvh flex flex-col justify-end bg-cover bg-center",
        coverSrc ? "bg-foreground" : "bg-background",
      )}
      style={coverSrc ? { backgroundImage: `url(${coverSrc})` } : undefined}
    >
      {coverSrc ? (
        <div className="fixed inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
      ) : null}

      <div
        className={cn(
          "relative flex flex-col items-center text-center px-6 pb-10 pt-16 gap-3",
          coverSrc ? "text-white" : "text-foreground",
        )}
      >
        <span
          className={cn(
            "flex flex-row items-center gap-1.5 text-xs rounded-full px-3 py-1.5",
            coverSrc
              ? "bg-white/20 backdrop-blur-sm"
              : "bg-surface text-muted-foreground",
          )}
        >
          <UserRoundIcon size={12} />
          Invited by {event.creator?.firstName || "the host"}
        </span>

        <h1 className="font-serif text-4xl max-w-80">{event.name}</h1>

        <div
          className={cn(
            "flex flex-row items-center gap-4 text-xs",
            coverSrc ? "text-white/80" : "text-muted-foreground",
          )}
        >
          <span className="flex flex-row items-center gap-1.5">
            <ClockIcon size={12} />
            {formatCountdown(event.endAt) || "Ended"}
          </span>
          <span className="flex flex-row items-center gap-1.5">
            <ApertureIcon size={12} />
            {shots}
          </span>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-2.5 mt-5">
          <Input
            icon={<PencilIcon size={16} />}
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(
              coverSrc &&
                "bg-white/15 backdrop-blur-sm text-white placeholder:text-white/60",
            )}
          />
          <Button
            variant="primary"
            onClick={handleJoin}
            disabled={joining}
            className={cn(
              "w-full justify-center",
              coverSrc && "bg-white/85 text-foreground hover:brightness-105",
            )}
          >
            {joining ? "Joining…" : "Take your camera"}
            <ArrowRightIcon size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
