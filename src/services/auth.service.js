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

async function checkEmail(email) {
  return await baseService("/auth/check-email", {
    method: "POST",
    requiresAuth: false,
    body: { email },
  });
}

// Fire-and-forget: the response says nothing about whether an account exists, so a
// stranger can't use it to probe for registered emails.
async function forgotPassword(email) {
  return await baseService("/forgot-password", {
    method: "POST",
    requiresAuth: false,
    body: { email },
  });
}

// The token comes out of the link in the reset email and travels in a header, the
// same one the API reads it from. There is no session involved — this is the one
// authenticated call a signed-out visitor can make.
async function resetPassword(token, password) {
  return await baseService("/reset-password", {
    method: "POST",
    requiresAuth: false,
    headers: { "reset-password-token": token },
    body: { password },
  });
}

async function deviceLogin(virtualId) {
  return await baseService("/auth/device", {
    method: "POST",
    requiresAuth: false,
    body: { virtualId },
  });
}

export default {
  login,
  checkEmail,
  forgotPassword,
  resetPassword,
  me,
  deviceLogin,
};
