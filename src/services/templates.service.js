import baseService, { baseUrl } from "./base.service";
import { encodeId } from "../utils/idCodec.util";

// The printable card attached to an event, and the catalogue of kinds of event that
// decides which cards are on offer at all.

// Every kind of event the setup wizard offers. Each carries `hasTemplates`, so the
// wizard can say up front whether picking it comes with any cards.
async function getEventTypes() {
  return await baseService("/event-types", { method: "GET" });
}

// What the Templates sheet renders: the cards this event's type is offered, whichever
// one the host already set up, and whether they may still change it.
async function getForEvent(eventId) {
  return await baseService(`/events/${eventId}/template`, { method: "GET" });
}

// Picking a card or editing its wording. The server draws the image as part of this,
// so the response already knows whether there is one to show.
//
// `inviteCode` is the event's URL code, and it travels from here because the id codec
// is deliberately client-only — the backend pairs it with its own origin to build the
// link behind the QR, and refuses anything that isn't a codec-shaped code.
async function save(eventId, { templateId, data }) {
  return await baseService(`/events/${eventId}/template`, {
    method: "PUT",
    body: { templateId, data, inviteCode: encodeId(eventId) },
  });
}

async function remove(eventId) {
  return await baseService(`/events/${eventId}/template`, { method: "DELETE" });
}

// The card itself. Always the same URL — the server replaces the object in place on
// every regeneration — so `generatedAt` rides along to keep the browser from showing a
// previous draw after an edit. <img> can't send headers, hence the token in the query,
// exactly as attachment variants do.
function getImageSrc(eventId, generatedAt) {
  const token = localStorage.getItem("accessToken");
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (generatedAt) params.set("v", String(new Date(generatedAt).getTime()));

  const query = params.toString();
  return `${baseUrl}/events/${eventId}/template/image${query ? `?${query}` : ""}`;
}

export default { getEventTypes, getForEvent, save, remove, getImageSrc };
