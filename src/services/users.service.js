import baseService from "./base.service";

async function getSingle(id) {
  return await baseService(`/users/${id}`, { method: "GET" });
}

async function update(id, body) {
  return await baseService(`/users/${id}`, { method: "PUT", body });
}

// A soft delete: the row keeps its id and everything attached to it, but every read
// path filters it out, so the account and its events go quiet together.
async function remove(id) {
  return await baseService(`/users/${id}`, { method: "DELETE" });
}

export default { getSingle, update, remove };
