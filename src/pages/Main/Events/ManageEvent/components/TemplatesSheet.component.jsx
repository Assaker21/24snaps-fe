import { useEffect, useState } from "react";
import {
  DownloadIcon,
  ImagePlusIcon,
  RefreshCwIcon,
  Share2Icon,
} from "lucide-react";
import templatesService from "../../../../../services/templates.service";
import eventsService from "../../../../../services/events.service";
import uploadFile from "../../../../../utils/upload.util";
import Button from "../../../../../components/Button.component";
import Input from "../../../../../components/Input.component";
import OptionTile from "../../../../../components/OptionTile.component";
import SectionLabel from "../../../../../components/SectionLabel.component";
import Sheet from "../../../../../components/Sheet.component";
import cn from "../../../../../utils/cn.util";
import {
  downloadTemplateImage,
  shareTemplateImage,
} from "../../../../../utils/templateImage.util";

// The host's printable card: pick one, write what it says, and take away an image to
// print or send.
//
// Which cards exist at all is catalogue data hanging off the event's type, so this
// sheet renders whatever the server offers rather than knowing any card by name — the
// form below is built from the fields the template declares, nothing here is
// hard-coded to the thank-you card.
//
// Editing stops when the event does. A finished album's card is a record of something
// that already happened, so `canManage` comes back false and only the download
// survives — the server enforces the same rule regardless of what is rendered here.

// A field's label, from its name: "textColor" -> "Text color".
function toLabel(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

// One input per declared field type. `image` is the only one that does any work — the
// file goes to storage through the same presigned route photos use, and what lands in
// the card's data is the resulting key.
function Field({ field, value, onChange, disabled, eventId }) {
  const [uploading, setUploading] = useState(false);
  const label = toLabel(field.name);

  if (field.type === "textarea") {
    return (
      <label className="flex flex-col gap-2">
        <SectionLabel>{label}</SectionLabel>
        <textarea
          rows={5}
          disabled={disabled}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full rounded-2xl bg-surface border border-input px-4 py-3",
            "text-[0.95rem] leading-snug resize-none outline-none",
            "focus:border-brand-border disabled:opacity-60",
          )}
        />
      </label>
    );
  }

  if (field.type === "color") {
    return (
      <label className="flex flex-row items-center justify-between gap-4">
        <SectionLabel>{label}</SectionLabel>
        <input
          type="color"
          disabled={disabled}
          value={value || "#2f2e29"}
          onChange={(e) => onChange(e.target.value)}
          className="size-10 rounded-xl bg-surface border border-input cursor-pointer disabled:opacity-60"
        />
      </label>
    );
  }

  if (field.type === "image") {
    return (
      <div className="flex flex-col gap-2">
        <SectionLabel>{label}</SectionLabel>
        <label
          className={cn(
            "flex flex-row items-center justify-center gap-2 cursor-pointer",
            "rounded-2xl bg-surface border border-input px-4 py-3 text-[0.95rem]",
            disabled && "opacity-60 pointer-events-none",
          )}
        >
          <ImagePlusIcon size={16} />
          {uploading ? "Uploading…" : value ? "Replace image" : "Add image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled || uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              setUploading(true);
              // Same presigned route a photo takes, so the key carries the uploader's
              // id — which is exactly what the server checks before drawing it.
              const storageKey = await uploadFile(file, file.type, {
                eventId,
                type: "PICTURE",
                fileName: file.name,
              });
              onChange(storageKey);
              setUploading(false);
            }}
          />
        </label>
      </div>
    );
  }

  return (
    <label className="flex flex-col gap-2">
      <SectionLabel>{label}</SectionLabel>
      <Input
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        disabled={disabled}
        value={
          field.type === "date" && value
            ? new Date(value).toISOString().slice(0, 10)
            : (value ?? "")
        }
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export default function TemplatesSheet({ open, setOpen, event, onUpdated }) {
  const [state, setState] = useState(null);
  const [draft, setDraft] = useState({});
  const [picked, setPicked] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // What both the initial read and a manual refresh do with an answer. "Loading" is
  // simply not having one yet, so nothing is set before the request resolves.
  function apply(response) {
    if (response.ok) {
      setState(response.data);
      setPicked(response.data.current?.templateId ?? null);
      setDraft(response.data.current?.data ?? {});
      setError(null);
    } else {
      setError(response.data?.message || "Couldn't load your templates.");
    }
  }

  // Read when the sheet opens rather than alongside the event: a host who never prints
  // a card should never pay for this request.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    templatesService.getForEvent(event.id).then((response) => {
      if (!cancelled) apply(response);
    });

    return () => {
      cancelled = true;
    };
  }, [open, event.id]);

  const reload = () =>
    templatesService.getForEvent(event.id).then(apply);

  const loading = !state && !error;
  const available = state?.available ?? [];
  const current = state?.current ?? null;
  const canManage = state?.canManage ?? false;

  // The card being edited: the one already set up, or whichever the host just picked.
  const selected = available.find((t) => t.id === picked) || null;

  function pick(template) {
    setPicked(template.id);
    // A card never set up starts from the wording its event type ships, so the host is
    // correcting a real card rather than filling in a blank form.
    setDraft(
      template.id === current?.templateId
        ? (current?.data ?? {})
        : (template.defaults ?? {}),
    );
  }

  async function handleSave() {
    if (!selected) return;

    setSaving(true);
    setError(null);

    const response = await templatesService.save(event.id, {
      templateId: selected.id,
      data: draft,
    });

    if (response.ok) {
      // The server draws the card as part of saving, so what comes back already knows
      // its new generatedAt — which is what moves the preview off the previous draw.
      setState((s) => ({ ...s, current: response.data }));
      setDraft(response.data.data ?? {});
      onUpdated?.();
    } else {
      setError(response.data?.message || "Couldn't save your template.");
    }

    setSaving(false);
  }

  // Both actions live in one util so the Share sheet offers the identical thing.
  async function handle(action) {
    setBusy(true);
    setError(null);
    await action(event, current?.generatedAt);
    setBusy(false);
  }

  function body() {
    if (loading) {
      return (
        <p className="text-sm text-subtle text-center mt-10">Loading cards…</p>
      );
    }

    // An event created before event types existed has none, so there is nothing to
    // look a card up by. Rather than a dead end, the host picks one here.
    if (!event.eventTypeId) {
      return (
        <TypePicker
          event={event}
          onPicked={() => {
            // The parent refetches the event (it is what carries eventTypeId), and
            // this sheet refetches what that type is now offering.
            onUpdated?.();
            reload();
          }}
        />
      );
    }

    if (!available.length) {
      return (
        <p className="text-sm text-subtle text-center mt-10 leading-relaxed">
          There are no templates for this kind of event yet.
          <br />
          We're adding more — check back before your event.
        </p>
      );
    }

    return (
      <>
        {/* More than one card on offer is a choice worth showing; exactly one isn't. */}
        {available.length > 1 ? (
          <div className="border-t border-border mt-6 pt-6">
            <SectionLabel>Template</SectionLabel>
            <div className="grid grid-cols-2 gap-2.5 mt-3">
              {available.map((template) => (
                <OptionTile
                  key={template.id}
                  selected={picked === template.id}
                  onClick={() => canManage && pick(template)}
                  className="h-16 text-[0.95rem]"
                >
                  {template.name}
                </OptionTile>
              ))}
            </div>
          </div>
        ) : null}

        {/* Nothing picked yet and only one card on offer: one press sets it up. */}
        {!selected ? (
          <div className="border-t border-border mt-6 pt-8 flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              {available[0].name} — a printable card carrying the QR code that
              brings your guests straight into the event.
            </p>
            <Button variant="primary" onClick={() => pick(available[0])}>
              Set up this template
            </Button>
          </div>
        ) : (
          <>
            {current?.hasImage && current.templateId === selected.id ? (
              <div className="border-t border-border mt-6 pt-6 flex justify-center">
                <img
                  src={templatesService.getImageSrc(
                    event.id,
                    current.generatedAt,
                  )}
                  alt={`${selected.name} preview`}
                  className="w-48 rounded-2xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)]"
                />
              </div>
            ) : null}

            {canManage ? (
              <div className="flex flex-col gap-5 border-t border-border mt-6 pt-6">
                {selected.fields.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    eventId={event.id}
                    value={draft[field.name]}
                    disabled={saving}
                    onChange={(next) =>
                      setDraft((d) => ({ ...d, [field.name]: next }))
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-subtle text-center mt-5">
                This event has ended, so its template can't be changed — but you
                can still download it.
              </p>
            )}

            <div className="flex flex-row flex-wrap gap-2.5 justify-center mt-7">
              {canManage ? (
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <RefreshCwIcon size={16} />
                  {saving ? "Saving…" : current ? "Save & redraw" : "Create template"}
                </Button>
              ) : null}

              {current?.hasImage ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => handle(downloadTemplateImage)}
                    disabled={busy}
                  >
                    <DownloadIcon size={16} />
                    Download
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handle(shareTemplateImage)}
                    disabled={busy}
                  >
                    <Share2Icon size={16} />
                    Share
                  </Button>
                </>
              ) : null}
            </div>
          </>
        )}

        {error ? (
          <p className="mt-5 text-sm text-danger text-center">{error}</p>
        ) : null}
      </>
    );
  }

  return (
    <Sheet
      open={open}
      setOpen={setOpen}
      title="Your event templates."
      description="A printable card your guests can scan to join — set the wording, then download it or send it to your printer."
    >
      {body()}
    </Sheet>
  );
}

// An event from before event types existed has none, and a card can only be offered
// against one. Setting it here is the same authenticated update the wizard makes.
function TypePicker({ event, onPicked }) {
  const [types, setTypes] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    templatesService.getEventTypes().then((response) => {
      if (response.ok) setTypes(response.data);
    });
  }, []);

  async function choose(type) {
    setSaving(true);
    const response = await eventsService.update(event.id, {
      eventTypeId: type.id,
    });
    setSaving(false);
    if (response.ok) onPicked?.();
  }

  return (
    <div className="border-t border-border mt-6 pt-6">
      <p className="text-sm text-muted-foreground text-center mb-5">
        Tell us what kind of event this is and we'll show you the templates
        that suit it.
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {types.map((type) => (
          <OptionTile
            key={type.id}
            onClick={() => !saving && choose(type)}
            className="h-16 text-[0.95rem]"
          >
            {type.name}
          </OptionTile>
        ))}
      </div>
    </div>
  );
}
