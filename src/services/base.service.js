import { DEVELOPMENT, DEVELOPMENT_MOBILE_URL } from "../config/config.js";

export const baseUrl = DEVELOPMENT
  ? DEVELOPMENT_MOBILE_URL || "http://localhost:2169"
  : "https://api.sawwerna.com";

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
    "device-id": localStorage.getItem("deviceId"),
    // Which client this is. There are three against one API now — this, the iOS app
    // and the Android app — and the API's logger names it on every line, so a failure
    // says where it came from. Stated rather than sniffed: the User-Agent is a guess
    // (an in-app web view lies about it), this is a fact we are telling the server.
    //
    // It is never authentication: anyone can send any value, so nothing
    // security-relevant hangs off it on either side.
    "client-platform": "web",
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

  let response;

  try {
    response = await fetch(`${baseUrl}${uri}`, fetchOptions);
  } catch (error) {
    // The request never reached the API. This is the one case with no status at all,
    // and callers key on exactly that to tell "the network dropped" apart from "the
    // server answered no" — Auth.context retries the former and would otherwise throw
    // a perfectly good session away over it.
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

  const authHeader = response.headers.get("access-token");

  if (authHeader) {
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : authHeader.trim();

    if (token) {
      localStorage.setItem("accessToken", token);
    }
  }

  // Reading the body used to sit inside the same try as the fetch, so anything the API
  // didn't answer as JSON — an empty body, Express's HTML 404, a 502 page from the
  // proxy in front of us — was reported as a transport failure with no status. That is
  // the one shape callers read as "unjudged": a 403 arriving as HTML looked like a
  // dropped packet, so the session was retried forever instead of falling back to a
  // guest one, and the app sat on its spinner. The status is now always the real one.
  const text = await response.text().catch(() => "");
  let data;

  try {
    // `{}` rather than null for an empty body: every caller reaches into `data`, and
    // an object with nothing in it is the shape they already handle.
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      type: "error",
      code: "non_json",
      message: text.slice(0, 200) || `Request failed (${response.status})`,
    };
  }

  return {
    ok: response.status >= 200 && response.status < 300,
    data,
    response,
    status: response.status,
  };
}
