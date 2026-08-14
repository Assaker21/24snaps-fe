import baseService from "./base.service";

async function login(body) {
  return await baseService("/login", {
    method: "POST",
    requiresAuth: false,
    body,
  });
}

async function me() {
  return await baseService("/me", {
    method: "GET",
    requiresAuth: true,
  });
}

async function deviceLogin(virtualId) {
  return await baseService("/auth/device", {
    method: "POST",
    requiresAuth: false,
    body: { virtualId },
  });
}

export default { login, me, deviceLogin };
