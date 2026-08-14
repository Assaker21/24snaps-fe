import baseService from "./base.service";

function toQueryString(query = {}) {
  const params = Object.entries(query).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  if (!params.length) return "";
  return "?" + new URLSearchParams(params).toString();
}

async function getMultiple(query) {
  return await baseService(`/events${toQueryString(query)}`, {
    method: "GET",
  });
}

async function getSingle(id) {
  return await baseService(`/events/${id}`, { method: "GET" });
}

async function create(body) {
  return await baseService("/events", { method: "POST", body });
}

async function update(id, body) {
  return await baseService(`/events/${id}`, { method: "PUT", body });
}

async function remove(id) {
  return await baseService(`/events/${id}`, { method: "DELETE" });
}

async function checkout(id) {
  return await baseService(`/events/${id}/checkout`, { method: "POST" });
}

export default { getMultiple, getSingle, create, update, remove, checkout };
