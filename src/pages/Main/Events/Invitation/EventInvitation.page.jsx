import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import eventsService from "../../../../services/events.service";
import usersService from "../../../../services/users.service";
import Button from "../../../../components/Button.component";
import Input from "../../../../components/Input.component";
import { useAuth } from "../../../../contexts/Auth.context";
import { encodeId, decodeId } from "../../../../utils/idCodec.util";

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

  if (
    authLoading ||
    loading ||
    !user ||
    isCreator ||
    isParticipant
  ) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-gray-500">
          This film doesn't exist or was deleted.
        </p>
        <Link to="/films">
          <Button variant="secondary">Back to films</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-serif text-2xl max-w-70">{event.name}</h1>
      <p className="text-sm text-gray-500">
        You've been invited by {event.creator?.firstName || "the host"}.
      </p>
      <Input
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="max-w-60"
      />
      <Button variant="primary" onClick={handleJoin} disabled={joining}>
        {joining ? "Joining…" : "Take your camera"}
      </Button>
    </div>
  );
}
