import attachmentsService from "../services/attachments.service";

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Returns the value to store as the attachment's storageKey: a real R2 object key
// on success, or (only when R2 isn't configured) an inline data: URI as a dev fallback.
export default async function uploadFile(
  blob,
  contentType,
  { eventId, type, isCover, fileName } = {},
) {
  const response = await attachmentsService.getUploadUrl({
    contentType,
    eventId,
    type,
    isCover,
    fileName,
  });

  if (response.ok && response.data) {
    const { uploadUrl, key } = response.data;

    const put = await fetch(uploadUrl, {
      method: "PUT",
      // Must match the headers the backend signed into the presigned URL
      // (storage.js's PutObjectCommand sets ContentType + IfNoneMatch) —
      // presigned SigV4 URLs fail signature verification if replayed headers differ.
      headers: { "Content-Type": contentType, "If-None-Match": "*" },
      body: blob,
    });

    // A rejected PUT still yields a resolved promise, so without this an expired
    // signature or a dropped connection would happily return a key pointing at nothing.
    if (!put.ok) {
      throw new Error(`Upload rejected by storage (${put.status})`);
    }

    return key;
  }

  return await blobToDataUrl(blob);
}
