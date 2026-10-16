import baseService from "./base.service";

// Always the caller's own history — the endpoint scopes to the authenticated user,
// there is no id to pass.
async function getMultiple() {
  return await baseService("/payments", { method: "GET" });
}

// One purchase of the caller's own. The server re-confirms it with Whish on every
// read, so this doubles as "did that payment actually go through?" — which is what the
// return page polls while the provider's callback is still in flight.
async function getSingle(id) {
  return await baseService(`/payments/${id}`, { method: "GET" });
}

export default { getMultiple, getSingle };
