import baseService from "./base.service";

// Public, sign-in-free views of a finished album. The link's number travels through
// the same codec every event id in a URL does — the API only ever deals in the number
// itself, exactly as it does for events.
//
// `getSingle` deliberately opts out of the auth header: this is the one read in the
// app that must behave identically for a visitor with no account, no device and no
// token, and sending a stale one would only invite a 401 that the endpoint never meant
// to produce.
async function getSingle(publicId) {
  return await baseService(`/share/${publicId}`, {
    method: "GET",
    requiresAuth: false,
  });
}

// Minting is the host's own action, so this one is authenticated. Every press makes a
// new link rather than returning the last one.
async function create(eventId) {
  return await baseService(`/events/${eventId}/share`, { method: "POST" });
}

export default { getSingle, create };
