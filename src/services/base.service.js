import { DEVELOPMENT } from "../config/config.js";

export const baseUrl = DEVELOPMENT
  ? "http://localhost:2169"
  : "https://batata.hoophouse.store";

export default async function baseService(uri, options = {}) {
  const {
    method = "GET",
    requiresAuth = true,
    body,
    headers = {},
    ...restOptions
  } = options;

  const configHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (requiresAuth) {
    const token = localStorage.getItem("accessToken");
    if (token) {
      configHeaders["access-token"] = `Bearer ${token}`;
    }
  }

  const fetchOptions = {
    method,
    headers: configHeaders,
    ...restOptions,
  };

  if (body && typeof body === "object") {
    fetchOptions.body = JSON.stringify(body);
  } else if (body) {
    fetchOptions.body = body;
  }

  try {
    const response = await fetch(`${baseUrl}${uri}`, fetchOptions);

    const authHeader = response.headers.get("access-token");

    if (authHeader) {
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.substring(7).trim()
        : authHeader.trim();

      if (token) {
        localStorage.setItem("accessToken", token);
      }
    }

    return {
      ok: response.status >= 200 && response.status < 300,
      data: await response.json(),
      response,
      status: response.status,
    };
  } catch (error) {
    console.log(`API Error on ${uri}:`, error);
    return {
      ok: false,
      data: {
        type: "error",
        code: "generic",
        message: "An error occurred",
      },
    };
  }
}
