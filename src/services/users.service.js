import baseService from "./base.service";

async function update(id, body) {
  return await baseService(`/users/${id}`, { method: "PUT", body });
}

export default { update };
