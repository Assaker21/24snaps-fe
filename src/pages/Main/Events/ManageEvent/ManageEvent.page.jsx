import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import {
  ArrowLeftIcon,
  CameraIcon,
  DownloadIcon,
  QrCodeIcon,
  SettingsIcon,
} from "lucide-react";
import eventsService from "../../../../services/events.service";
import attachmentsService from "../../../../services/attachments.service";
import usersService from "../../../../services/users.service";
import Button from "../../../../components/Button.component";
import Input from "../../../../components/Input.component";
import { useAuth } from "../../../../contexts/Auth.context";
import { formatCountdown } from "../../../../utils/countdown.util";
import cn from "../../../../utils/cn.util";
import InviteSheet from "./components/InviteSheet.component";
import SettingsSheet from "./components/SettingsSheet.component";

export default function ManageEventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, setUser, loading: authLoading } = useAuth();

  const [event, setEvent] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!authLoading) load();
  }, [eventId, authLoading]);

  async function load() {
    setLoading(true);
    const response = await eventsService.getSingle(eventId);
    if (response.ok) {
      setEvent(response.data);
      const attachmentsResponse = await attachmentsService.getMultiple({
        eventId,
      });
      if (attachmentsResponse.ok) setAttachments(attachmentsResponse.data);
    } else {
      setEvent(null);
    }
    setLoading(false);
  }

  async function handleCheckoutRetry() {
    const response = await eventsService.checkout(eventId);
    if (response.ok && response.data.checkoutUrl) {
      window.location.href = response.data.checkoutUrl;
    } else {
      load();
    }
  }

  async function handleJoin() {
    setJoining(true);
    if (name.trim()) {
      await usersService.update(user.id, { firstName: name.trim() });
      setUser((u) => ({ ...u, firstName: name.trim() }));
    }
    await eventsService.update(eventId, {
      participants: { connect: { id: user.id } },
    });
    navigate(`/events/${eventId}/camera`);
  }

  if (authLoading || loading || !user) {
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

  const isCreator = event.creatorId === user.id;
  const isParticipant = event.participants?.some((p) => p.id === user.id);

  if (isCreator && !event.paidAt) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-serif text-2xl">Almost there</h1>
        <p className="text-sm text-gray-500">
          Complete payment to activate "{event.name}".
        </p>
        <Button variant="primary" onClick={handleCheckoutRetry}>
          Complete payment
        </Button>
      </div>
    );
  }

  if (!isCreator && !isParticipant) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-serif text-2xl max-w-70">{event.name}</h1>
        <p className="text-sm text-gray-500">
          You've been invited by{" "}
          {event.creator?.firstName || "the host"}.
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

  const revealed = event.revealAt && new Date(event.revealAt) <= new Date();

  return (
    <div className="min-h-dvh flex flex-col pb-10">
      <div
        className="w-full h-56 bg-gray-300 bg-cover bg-center flex items-start justify-between p-4 shrink-0"
        style={
          event.mainAttachment?.downloadUrl
            ? {
                backgroundImage: `url(${attachmentsService.getDownloadSrc(event.mainAttachment)})`,
              }
            : undefined
        }
      >
        <button
          onClick={() => navigate("/films")}
          className="bg-black/40 text-white rounded-full p-2.5 backdrop-blur-sm cursor-pointer"
        >
          <ArrowLeftIcon size={18} />
        </button>
        {isCreator && (
          <button
            onClick={() => setSettingsOpen(true)}
            className="bg-black/40 text-white rounded-full p-2.5 backdrop-blur-sm cursor-pointer"
          >
            <SettingsIcon size={18} />
          </button>
        )}
      </div>

      <div className="px-4 pt-4">
        <h1 className="font-serif text-2xl">{event.name}</h1>
        <p className="text-sm text-gray-500">
          {formatCountdown(event.endAt)} · {event.participants?.length ?? 0}{" "}
          people
        </p>

        <div className="flex flex-row gap-2 mt-4">
          <Button
            variant="secondary"
            disabled
            title="Coming soon"
            className="flex-1 justify-center opacity-50 cursor-not-allowed"
          >
            <DownloadIcon size={16} />
            Export
          </Button>
          {isCreator && (
            <Button
              variant="secondary"
              onClick={() => setInviteOpen(true)}
              className="flex-1 justify-center"
            >
              <QrCodeIcon size={16} />
              Invite
            </Button>
          )}
          <Link to={`/events/${eventId}/camera`} className="flex-1">
            <Button variant="primary" className="w-full justify-center">
              <CameraIcon size={16} />
              Camera
            </Button>
          </Link>
        </div>
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center mt-10">
          No moments captured yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 px-4 mt-6">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative aspect-square rounded-2xl overflow-hidden bg-gray-200"
            >
              <img
                src={attachmentsService.getDownloadSrc(attachment)}
                alt=""
                className={cn(
                  "w-full h-full object-cover",
                  !revealed && "blur-xl scale-110",
                )}
              />
              {!revealed && (
                <div className="absolute inset-0 flex items-center justify-center px-2">
                  <span className="bg-black/50 text-white text-xs rounded-full px-3 py-1 text-center">
                    Reveals{" "}
                    {event.revealAt
                      ? new Date(event.revealAt).toLocaleString()
                      : "soon"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <InviteSheet open={inviteOpen} setOpen={setInviteOpen} event={event} />
      <SettingsSheet
        open={settingsOpen}
        setOpen={setSettingsOpen}
        event={event}
        onUpdated={load}
      />
    </div>
  );
}
