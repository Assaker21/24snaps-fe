import { useRef } from "react";
import QRCode from "react-qr-code";
import { LinkIcon, DownloadIcon } from "lucide-react";
import Button from "../../../../../components/Button.component";
import Sheet from "../../../../../components/Sheet.component";
import { useT } from "../../../../../contexts/I18n.context";
import { encodeId } from "../../../../../utils/idCodec.util";
import { saveBlob } from "../../../../../utils/download.util";

export default function InviteSheet({ open, setOpen, event }) {
  const t = useT();
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
    saveBlob(blob, `${event.name || "invite"}-qr.svg`);
  }

  return (
    <Sheet
      open={open}
      setOpen={setOpen}
      title={t("invite.title")}
      description={t("invite.body")}
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
          {t("invite.shareLink")}
        </Button>
        <Button variant="secondary" onClick={handleSaveQr}>
          <DownloadIcon size={16} />
          {t("invite.saveQr")}
        </Button>
      </div>
    </Sheet>
  );
}
