import baseService from "./base.service";

// Always the caller's own history — the endpoint scopes to the authenticated user,
// there is no id to pass.
async function getMultiple() {
  return await baseService("/payments", { method: "GET" });
}

export default { getMultiple };
