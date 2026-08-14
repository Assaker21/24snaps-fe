import { useState } from "react";
import { useNavigate } from "react-router";
import { Drawer } from "vaul";
import {
  ChevronRightIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  UnlockIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import Button from "../../../../../components/Button.component";
import Input from "../../../../../components/Input.component";
import eventsService from "../../../../../services/events.service";
import uploadFile from "../../../../../utils/upload.util";
import attachmentsService from "../../../../../services/attachments.service";
import cn from "../../../../../utils/cn.util";
import Calendar from "../../CreateEvent/components/Calendar.component";
import { TimePicker } from "../../CreateEvent/components/TimePicker.component";

function Row({ icon, label, value, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-row items-center justify-between w-full bg-gray-100 rounded-2xl p-4 text-left",
        danger && "bg-red-50 text-red-600",
      )}
    >
      <span className="flex flex-row items-center gap-3 text-sm font-medium">
        {icon}
        {label}
      </span>
      <span className="flex flex-row items-center gap-1 text-sm text-gray-500">
        {value}
        {onClick ? <ChevronRightIcon size={16} /> : null}
      </span>
    </button>
  );
}

export default function SettingsSheet({ open, setOpen, event, onUpdated }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState(event.name || "");
  const [savingCover, setSavingCover] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveField(data) {
    await eventsService.update(event.id, data);
    setEditing(null);
    onUpdated?.();
  }

  async function handleCoverChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSavingCover(true);
    const storageKey = await uploadFile(file, file.type);
    const attachmentResponse = await attachmentsService.create({
      storageKey,
      type: "PICTURE",
    });
    if (attachmentResponse.ok) {
      await eventsService.update(event.id, {
        mainAttachmentId: attachmentResponse.data.id,
      });
      onUpdated?.();
    }
    setSavingCover(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${event.name}"? This can't be undone.`)) return;
    setDeleting(true);
    await eventsService.remove(event.id);
    navigate("/films");
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-251" />
        <Drawer.Content className="z-251 bg-white flex flex-col fixed bottom-0 left-0 right-0 max-h-[85vh] rounded-t-[10px]">
          <div className="max-w-md w-full mx-auto overflow-auto p-4 rounded-t-[10px]">
            <Drawer.Handle />

            <div className="flex flex-row items-start justify-between pt-4 mb-4">
              <Drawer.Title className="text-xl font-bold font-serif flex-1 leading-tight tracking-tight">
                Film Settings
              </Drawer.Title>
              <Drawer.Close asChild>
                <Button
                  variant="secondary"
                  className="rounded-full aspect-square p-3"
                >
                  <XIcon className="size-6 p-0" />
                </Button>
              </Drawer.Close>
            </div>

            <div className="flex flex-col gap-2">
              <Row
                icon={<PencilIcon size={16} />}
                label="Name & Cover"
                value={event.name}
                onClick={() =>
                  setEditing(editing === "name" ? null : "name")
                }
              />
              {editing === "name" && (
                <div className="flex flex-col gap-2 px-1 pb-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <div className="flex flex-row gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      className="text-sm"
                      onClick={() => saveField({ name })}
                    >
                      Save name
                    </Button>
                    <label
                      className={cn(
                        "text-sm flex flex-row gap-2 items-center py-3 px-4 rounded-2xl font-medium text-black bg-white shadow-sm border border-gray-200 cursor-pointer",
                        savingCover && "opacity-50 pointer-events-none",
                      )}
                    >
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
                icon={<ClockIcon size={16} />}
                label="Ending date"
                value={
                  event.endAt
                    ? new Date(event.endAt).toLocaleString()
                    : "Not set"
                }
                onClick={() =>
                  setEditing(editing === "endAt" ? null : "endAt")
                }
              />
              {editing === "endAt" && (
                <div className="flex flex-col items-center gap-2 px-1 pb-2">
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
                value={
                  event.revealAt
                    ? new Date(event.revealAt).toLocaleString()
                    : "Not set"
                }
                onClick={() =>
                  setEditing(editing === "revealAt" ? null : "revealAt")
                }
              />
              {editing === "revealAt" && (
                <div className="flex flex-col items-center gap-2 px-1 pb-2">
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
                  event.maxUsers ? `Up to ${event.maxUsers}` : "Unlimited"
                }
              />

              <Row
                icon={<UserIcon size={16} />}
                label="Shots per person"
                value={event.maxAttachmentsPerUser ?? "Unlimited"}
              />

              <Row
                icon={<UnlockIcon size={16} />}
                label="Everyone can see all photos"
                value={
                  <div
                    role="switch"
                    aria-checked={event.visibilityAll}
                    onClick={(e) => {
                      e.stopPropagation();
                      saveField({ visibilityAll: !event.visibilityAll });
                    }}
                    className={cn(
                      "w-10 h-6 rounded-full flex items-center px-0.5 cursor-pointer transition-colors",
                      event.visibilityAll ? "bg-green-500" : "bg-gray-300",
                    )}
                  >
                    <div
                      className={cn(
                        "size-5 rounded-full bg-white transition-transform",
                        event.visibilityAll && "translate-x-4",
                      )}
                    />
                  </div>
                }
              />

              <Row
                icon={<TrashIcon size={16} />}
                label={deleting ? "Deleting…" : "Delete"}
                value=""
                danger
                onClick={deleting ? undefined : handleDelete}
              />
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
