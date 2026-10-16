import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ApertureIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  ImagePlusIcon,
  PencilIcon,
  TrashIcon,
  UnlockIcon,
  UserIcon,
} from "lucide-react";
import Button from "../../../../../components/Button.component";
import Input from "../../../../../components/Input.component";
import Sheet from "../../../../../components/Sheet.component";
import Toggle from "../../../../../components/Toggle.component";
import eventsService from "../../../../../services/events.service";
import uploadFile from "../../../../../utils/upload.util";
import attachmentsService from "../../../../../services/attachments.service";
import cn from "../../../../../utils/cn.util";
import Calendar from "../../CreateEvent/components/Calendar.component";
import { TimePicker } from "../../CreateEvent/components/TimePicker.component";

// One settings line: icon + label on the left, current value on the right, and a
// chevron only when the row actually opens something.
function Row({ icon, label, value, onClick }) {
  const Element = onClick ? "button" : "div";

  return (
    <Element
      {...(onClick ? { type: "button", onClick } : {})}
      className={cn(
        "flex flex-row items-center justify-between gap-3 w-full bg-surface rounded-2xl px-4 py-4 text-left",
        onClick && "cursor-pointer transition-colors hover:bg-surface-strong",
      )}
    >
      <span className="flex flex-row items-center gap-3 text-[0.95rem] font-medium shrink-0">
        {icon}
        {label}
      </span>
      <span className="flex flex-row items-center gap-1.5 text-sm text-muted-foreground min-w-0">
        <span className="truncate">{value}</span>
        {onClick ? <ChevronRightIcon size={16} className="shrink-0" /> : null}
      </span>
    </Element>
  );
}

export default function SettingsSheet({ open, setOpen, event, onUpdated }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState(event.name || "");
  const [savingCover, setSavingCover] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  // The API refuses some of what this sheet can ask for — a finish time before the
  // event opened, a reveal before that. Those answers used to be dropped on the floor:
  // the editor closed and the row went on showing the old value, so the host was told
  // their change had saved when it hadn't.
  async function saveField(data) {
    setError(null);

    const response = await eventsService.update(event.id, data);

    if (!response.ok) {
      setError(response.data?.message || "That change couldn't be saved.");
      return;
    }

    setEditing(null);
    onUpdated?.();
  }

  async function handleCoverChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSavingCover(true);
    setError(null);

    // uploadFile throws on a refused presign or a rejected PUT, which used to leave
    // this button reading "Uploading…" for the rest of the sheet's life.
    try {
      const storageKey = await uploadFile(file, file.type, {
        eventId: event.id,
        type: "PICTURE",
        isCover: true,
        fileName: file.name,
      });
      const attachmentResponse = await attachmentsService.create({
        storageKey,
        type: "PICTURE",
        isCover: true,
      });

      if (!attachmentResponse.ok) {
        throw new Error(attachmentResponse.data?.message || "Upload refused");
      }

      const updateResponse = await eventsService.update(event.id, {
        mainAttachmentId: attachmentResponse.data.id,
      });

      if (!updateResponse.ok) {
        throw new Error(updateResponse.data?.message || "Couldn't set the cover");
      }

      onUpdated?.();
    } catch (uploadError) {
      console.warn("Cover upload failed:", uploadError);
      setError(uploadError.message || "That cover couldn't be uploaded.");
    } finally {
      setSavingCover(false);
      // So picking the same file again still fires a change event.
      e.target.value = "";
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${event.name}"? This can't be undone.`)) return;

    setDeleting(true);
    setError(null);

    const response = await eventsService.remove(event.id);

    // Leaving for the events list on a refusal told the host their album was gone
    // while it was still there — and the list it sent them to would still show it.
    if (!response.ok) {
      setError(response.data?.message || "That event couldn't be deleted.");
      setDeleting(false);
      return;
    }

    navigate("/events");
  }

  const formatMoment = (date) =>
    date
      ? new Date(date).toLocaleString([], {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "Not set";

  return (
    <Sheet open={open} setOpen={setOpen} title="Event Settings">
      <div className="flex flex-col gap-2.5 mt-7">
        <Row
          icon={<PencilIcon size={16} />}
          label="Name & Cover"
          value={event.name}
          onClick={() => setEditing(editing === "name" ? null : "name")}
        />
        {editing === "name" && (
          <div className="flex flex-col gap-2.5 pb-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex flex-row gap-2.5">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => saveField({ name })}
              >
                Save name
              </Button>
              <label
                className={cn(
                  "flex flex-row items-center gap-2 text-sm font-medium cursor-pointer",
                  "bg-surface text-foreground rounded-full py-2 px-3.5",
                  "transition-transform duration-200 active:scale-95",
                  savingCover && "opacity-45 pointer-events-none",
                )}
              >
                <ImagePlusIcon size={16} />
                {savingCover ? "Uploading…" : "Change cover"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverChange}
                />
              </label>
            </div>
          </div>
        )}

        <Row
          icon={<CalendarIcon size={16} />}
          label="Ending date"
          value={formatMoment(event.endAt)}
          onClick={() => setEditing(editing === "endAt" ? null : "endAt")}
        />
        {editing === "endAt" && (
          <div className="flex flex-col items-center gap-2 pb-2">
            <Calendar
              selected={new Date(event.endAt)}
              onSelect={(date) => {
                if (!date) return;
                const current = new Date(event.endAt);
                current.setFullYear(date.getFullYear());
                current.setMonth(date.getMonth());
                current.setDate(date.getDate());
                saveField({ endAt: current });
              }}
            />
            <TimePicker
              value={new Date(event.endAt)}
              onChange={(time) => {
                if (!time) return;
                const current = new Date(event.endAt);
                current.setHours(time.getHours());
                current.setMinutes(time.getMinutes());
                saveField({ endAt: current });
              }}
            />
          </div>
        )}

        <Row
          icon={<ClockIcon size={16} />}
          label="Reveal time"
          value={formatMoment(event.revealAt)}
          onClick={() => setEditing(editing === "revealAt" ? null : "revealAt")}
        />
        {editing === "revealAt" && (
          <div className="flex flex-col items-center gap-2 pb-2">
            <Calendar
              selected={new Date(event.revealAt || event.endAt)}
              onSelect={(date) => {
                if (!date) return;
                const current = new Date(event.revealAt || event.endAt);
                current.setFullYear(date.getFullYear());
                current.setMonth(date.getMonth());
                current.setDate(date.getDate());
                saveField({ revealAt: current });
              }}
            />
            <TimePicker
              value={new Date(event.revealAt || event.endAt)}
              onChange={(time) => {
                if (!time) return;
                const current = new Date(event.revealAt || event.endAt);
                current.setHours(time.getHours());
                current.setMinutes(time.getMinutes());
                saveField({ revealAt: current });
              }}
            />
          </div>
        )}

        <Row
          icon={<UserIcon size={16} />}
          label="Participants"
          value={
            event.maxUsers ? `Up to ${event.maxUsers} participants` : "Unlimited"
          }
        />

        <Row
          icon={<ApertureIcon size={16} />}
          label="Shots per person"
          value={event.maxAttachmentsPerUser ?? "Unlimited"}
        />

        <div className="flex flex-row items-center justify-between gap-3 w-full bg-surface rounded-2xl px-4 py-4">
          <span className="flex flex-row items-center gap-3 text-[0.95rem] font-medium">
            <UnlockIcon size={16} />
            Everyone can see all photos
          </span>
          <Toggle
            checked={!!event.visibilityAll}
            onChange={(next) => saveField({ visibilityAll: next })}
            label="Everyone can see all photos"
          />
        </div>

        <button
          type="button"
          onClick={deleting ? undefined : handleDelete}
          className={cn(
            "flex flex-row items-center justify-center gap-2 w-full mt-4",
            "bg-danger-soft border border-danger/15 text-danger",
            "rounded-2xl px-4 py-4 text-[0.95rem] font-medium cursor-pointer",
            "transition-[transform,filter] duration-200 active:scale-[0.98]",
            deleting && "opacity-45 pointer-events-none",
          )}
        >
          <TrashIcon size={16} />
          {deleting ? "Deleting…" : "Delete"}
        </button>

        {error ? (
          <p className="text-sm text-danger text-center mt-1">{error}</p>
        ) : null}
      </div>
    </Sheet>
  );
}
