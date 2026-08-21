import { useEffect } from "react";
import Button from "./Button.component";

// A centred, single-acknowledgement modal for "you can't do that yet" moments. The
// bottom Sheet is the app's usual overlay, but it is built for panels of controls with
// no close button — this is for a short message that has to interrupt an action.
export default function AlertDialog({ open, onClose, title, message }) {
  useEffect(() => {
    if (!open) return;

    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-270 bg-black/45 flex items-center justify-center p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm bg-background rounded-3xl p-6 flex flex-col items-center text-center shadow-[0_20px_60px_-20px_rgba(0,0,0,0.4)]"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className="font-serif text-2xl">{title}</h2>
        <p className="text-[0.95rem] text-muted-foreground leading-snug mt-3">
          {message}
        </p>
        <Button
          variant="primary"
          onClick={onClose}
          autoFocus
          className="w-full justify-center mt-6"
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
