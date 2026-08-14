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

// attachment.downloadUrl is either a same-origin API path ("/attachments/:id/download")
// that needs the access token attached, or (dev-only R2 fallback) an inline data: URI
// that can be used as-is.
function getDownloadSrc(attachment) {
  const downloadUrl = attachment?.downloadUrl;
  if (!downloadUrl) return undefined;
  if (downloadUrl.startsWith("data:")) return downloadUrl;

  const token = localStorage.getItem("accessToken");
  return `${baseUrl}${downloadUrl}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

export default { getMultiple, create, getUploadUrl, getDownloadSrc };
