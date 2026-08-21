import { useRef } from "react";
import QRCode from "react-qr-code";
import { LinkIcon, DownloadIcon } from "lucide-react";
import Button from "../../../../../components/Button.component";
import Sheet from "../../../../../components/Sheet.component";
import { encodeId } from "../../../../../utils/idCodec.util";

export default function InviteSheet({ open, setOpen, event }) {
  const qrRef = useRef(null);
  const inviteUrl = `${window.location.origin}/events/invitation/${encodeId(event.id)}`;

  async function handleShareLink() {
    if (navigator.share) {
      try {
        await navigator.share({ title: event.name, url: inviteUrl });
        return;
      } catch {
        // user cancelled or share failed — fall back to clipboard
      }
    }
    await navigator.clipboard.writeText(inviteUrl);
  }

  function handleSaveQr() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.name || "invite"}-qr.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Sheet
      open={open}
      setOpen={setOpen}
      title="Invite guests to your film."
      description="Take a glimpse of your world through their lens. Invite your guests to make this film unforgettable."
    >
      <div className="border-t border-border mt-6 pt-8">
        <div ref={qrRef} className="flex flex-row items-center justify-center">
          <div className="p-5 bg-white rounded-3xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)]">
            <QRCode value={inviteUrl} size={200} />
          </div>
        </div>
      </div>

      <div className="flex flex-row gap-2.5 justify-center mt-8">
        <Button variant="secondary" onClick={handleShareLink}>
          <LinkIcon size={16} />
          Share Link
        </Button>
        <Button variant="secondary" onClick={handleSaveQr}>
          <DownloadIcon size={16} />
          Save QR image
        </Button>
      </div>
    </Sheet>
  );
}
