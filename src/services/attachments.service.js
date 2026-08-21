import baseService, { baseUrl } from "./base.service";

function toQueryString(query = {}) {
  const params = Object.entries(query).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  if (!params.length) return "";
  return "?" + new URLSearchParams(params).toString();
}

async function getMultiple(query) {
  return await baseService(`/attachments${toQueryString(query)}`, {
    method: "GET",
  });
}

async function create(body) {
  return await baseService("/attachments", { method: "POST", body });
}

async function getUploadUrl({ contentType, eventId, type, isCover, fileName }) {
  return await baseService("/attachments/upload-url", {
    method: "POST",
    body: { contentType, eventId, type, isCover, fileName },
  });
}

// Resolves one version of an attachment to a usable <img>/<video> src.
//
// attachment.urls holds only the variants the server is willing to serve this user —
// before an event reveals, an ordinary participant gets "blur" and nothing else, so an
// absent entry here means the request would 403 anyway. An entry is one of three things:
//   - an absolute presigned storage URL, which the browser hits directly (what the
//     event payload embeds, so a gallery costs one request per image, not two)
//   - a same-origin API path needing the access token appended (<img> can't send headers)
//   - an inline data: URI, the dev-only no-R2 fallback, usable as-is
//
// Variants: "full" (download), "thumb" (viewing), "blur" (pre-reveal), "cover".
function getSrc(attachment, variant = "thumb") {
  if (!attachment) return undefined;

  // Once the server sends a urls map, it is authoritative: an absent entry means the
  // request would 403 (gated) or 404 (variant not generated yet), so returning
  // undefined and letting the caller show its placeholder beats a broken <img>.
  const urls = attachment.urls;
  const url =
    urls && Object.keys(urls).length ? urls[variant] : attachment.downloadUrl;
  if (!url) return undefined;
  if (url.startsWith("data:")) return url;
  // Already signed and absolute — appending our token would break the signature.
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  const token = localStorage.getItem("accessToken");
  if (!token) return `${baseUrl}${url}`;

  // The variant URLs already carry a query string, so the token can't assume "?".
  const separator = url.includes("?") ? "&" : "?";
  return `${baseUrl}${url}${separator}token=${encodeURIComponent(token)}`;
}

export default { getMultiple, create, getUploadUrl, getSrc };
