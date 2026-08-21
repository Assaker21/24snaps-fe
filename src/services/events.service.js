import baseService from "./base.service";

function toQueryString(query = {}) {
  const params = Object.entries(query).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  if (!params.length) return "";
  return "?" + new URLSearchParams(params).toString();
}

// Last successful payload per event id, kept for the session. Moving between the event
// screen and the camera is the app's most-walked path, and both render off this one
// response — serving the previous copy lets those screens paint immediately and
// revalidate underneath instead of showing a spinner every time.
//
// The embedded attachment URLs are presigned with a comfortable TTL, so a cached
// payload is renderable, not just readable.
const singleCache = new Map();

function getCached(id) {
  return singleCache.get(String(id));
}

function invalidate(id) {
  if (id == null) singleCache.clear();
  else singleCache.delete(String(id));
}

// For changes the client already knows about — a photo that just finished uploading —
// so the next screen paints with it instead of a payload that predates it.
function setCached(id, event) {
  if (event) singleCache.set(String(id), event);
}

async function getMultiple(query) {
  return await baseService(`/events${toQueryString(query)}`, {
    method: "GET",
  });
}

async function getSingle(id) {
  const response = await baseService(`/events/${id}`, { method: "GET" });
  if (response.ok) singleCache.set(String(id), response.data);
  return response;
}

async function create(body) {
  return await baseService("/events", { method: "POST", body });
}

async function update(id, body) {
  const response = await baseService(`/events/${id}`, { method: "PUT", body });
  // Settings changes, cover swaps and joins all land here; whatever the cache holds
  // for this event is now behind the truth.
  invalidate(id);
  return response;
}

async function remove(id) {
  const response = await baseService(`/events/${id}`, { method: "DELETE" });
  invalidate(id);
  return response;
}

async function checkout(id) {
  return await baseService(`/events/${id}/checkout`, { method: "POST" });
}

export default {
  getMultiple,
  getSingle,
  getCached,
  setCached,
  invalidate,
  create,
  update,
  remove,
  checkout,
};
