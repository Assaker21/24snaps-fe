import { useState } from "react";
import QRCode from "react-qr-code";
import { CheckIcon, LinkIcon, RefreshCwIcon } from "lucide-react";
import shareService from "../../../../../services/share.service";
import Button from "../../../../../components/Button.component";
import Sheet from "../../../../../components/Sheet.component";
import { encodeId } from "../../../../../utils/idCodec.util";

// Publishing a finished album. Every press of "Generate" mints a new link server-side,
// so a host can hand a different one to each group — and the sheet only ever shows the
// link it just made, because there is nothing to "look up": the last one is still live
// wherever it was already sent.
export default function ShareSheet({ open, setOpen, event }) {
  const [link, setLink] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // The link's number goes through the same codec an event id in a URL does — the API
  // deals only in the number, the address bar only in the code.
  const shareUrl = link
    ? `${window.location.origin}/share/${encodeId(link.publicId)}`
    : null;

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setCopied(false);

    const response = await shareService.create(event.id);
    if (response.ok) setLink(response.data);
    else setError(response.data?.message || "Couldn't create a link just now.");

    setGenerating(false);
  }

  async function handleShare() {
    if (!shareUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({ title: event.name, url: shareUrl });
        return;
      } catch {
        // Cancelled, or the browser refused — fall through to the clipboard.
      }
    }

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
  }

  return (
    <Sheet
      open={open}
      setOpen={setOpen}
      title="Share the album."
      description="Anyone with the link can look through this album and save the photos in full quality — no account, no sign-in, nothing to install."
    >
      {!shareUrl ? (
        <div className="border-t border-border mt-6 pt-8 flex flex-col items-center gap-4">
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={generating}
          >
            <LinkIcon size={16} />
            {generating ? "Generating…" : "Generate a link"}
          </Button>

          {error ? (
            <p className="text-sm text-danger text-center">{error}</p>
          ) : (
            <p className="text-xs text-subtle text-center max-w-xs">
              Photos you have hidden stay hidden.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="border-t border-border mt-6 pt-8">
            <div className="flex flex-row items-center justify-center">
              <div className="p-5 bg-white rounded-3xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)]">
                <QRCode value={shareUrl} size={200} />
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground break-all bg-surface rounded-2xl px-4 py-3">
            {shareUrl}
          </p>

          <div className="flex flex-row gap-2.5 justify-center mt-6">
            <Button variant="primary" onClick={handleShare}>
              {copied ? <CheckIcon size={16} /> : <LinkIcon size={16} />}
              {copied ? "Copied" : "Share link"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleGenerate}
              disabled={generating}
            >
              <RefreshCwIcon size={16} />
              {generating ? "Generating…" : "New link"}
            </Button>
          </div>

          {error ? (
            <p className="mt-4 text-sm text-danger text-center">{error}</p>
          ) : null}
        </>
      )}
    </Sheet>
  );
}
