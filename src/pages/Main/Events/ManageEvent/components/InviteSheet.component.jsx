import { useRef } from "react";
import { Drawer } from "vaul";
import QRCode from "react-qr-code";
import { LinkIcon, DownloadIcon, XIcon } from "lucide-react";
import Button from "../../../../../components/Button.component";

export default function InviteSheet({ open, setOpen, event }) {
  const qrRef = useRef(null);
  const inviteUrl = `${window.location.origin}/events/${event.id}`;

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
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-251" />
        <Drawer.Content className="z-251 bg-white flex flex-col fixed bottom-0 left-0 right-0 max-h-[82vh] rounded-t-[10px]">
          <div className="max-w-md w-full mx-auto overflow-auto p-4 rounded-t-[10px]">
            <Drawer.Handle />

            <div className="flex flex-row items-start justify-between pt-4">
              <Drawer.Title className="text-xl font-bold font-serif flex-1 leading-tight tracking-tight">
                Invite guests to your film.
              </Drawer.Title>
              <Drawer.Close asChild>
                <Button
                  variant="secondary"
                  className="rounded-full aspect-square p-3"
                >
                  <XIcon className="size-6 p-0" />
                </Button>
              </Drawer.Close>
            </div>

            <Drawer.Description className="text-sm text-secondary mt-2">
              Take a glimpse of your world through their lens. Invite your
              guests to make this film unforgettable.
            </Drawer.Description>

            <div
              ref={qrRef}
              className="flex flex-row items-center justify-center py-8"
            >
              <div className="p-4 bg-white border border-gray-200 rounded-2xl">
                <QRCode value={inviteUrl} size={200} />
              </div>
            </div>

            <div className="flex flex-row gap-2 pb-4">
              <Button
                variant="secondary"
                className="flex-1 justify-center"
                onClick={handleShareLink}
              >
                <LinkIcon size={16} />
                Share Link
              </Button>
              <Button
                variant="secondary"
                className="flex-1 justify-center"
                onClick={handleSaveQr}
              >
                <DownloadIcon size={16} />
                Save QR image
              </Button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
