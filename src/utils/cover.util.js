import attachmentsService from "../services/attachments.service";

// The stand-in every event falls back to when its host hasn't chosen a cover. It is a
// static asset, never an attachment: nothing about it is written to the database or
// uploaded to storage, so an event with no cover still *has* no cover — it just never
// renders as an empty grey box.
export const DEFAULT_COVER_SRC = "/default-cover.jpg";

// Resolves an event's cover to something an <img>/background-image can always use.
// `variant` follows attachmentsService.getSrc: "cover" for the hero and the invitation
// card, which is the only version a cover attachment has.
export function getCoverSrc(event, variant = "cover") {
  return (
    attachmentsService.getSrc(event?.mainAttachment, variant) ||
    DEFAULT_COVER_SRC
  );
}

// Whether what getCoverSrc() returned is the host's own photo. The screens that lay
// white text over the cover want to know: the default image is dark enough to carry it,
// but a "change your cover" prompt shouldn't claim there is one.
export function hasOwnCover(event) {
  return Boolean(attachmentsService.getSrc(event?.mainAttachment, "cover"));
}
