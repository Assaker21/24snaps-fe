import { useEffect } from "react";
import Button from "./Button.component";

// A centred modal for "you can't do that yet" moments. The bottom Sheet is the app's
// usual overlay, but it is built for panels of controls with no close button — this is
// for a short message that has to interrupt an action.
//
// Passing `onConfirm` turns it into a two-button confirmation instead, for the handful
// of actions that can't be undone (deleting an event, closing an account). Without it
// the dialog is a single acknowledgement.
export default function AlertDialog({
  open,
  onClose,
  title,
  message,
  onConfirm,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  cancelLabel = "Cancel",
  busy,
}) {
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

        {onConfirm ? (
          <div className="flex flex-col w-full gap-2.5 mt-6">
            {/* Cancel is the one that takes focus: a destructive button should never
                be one stray Enter away, even though it reads first. */}
            <Button
              variant={confirmVariant}
              onClick={onConfirm}
              disabled={busy}
              className="w-full justify-center"
            >
              {confirmLabel}
            </Button>
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={busy}
              autoFocus
              className="w-full justify-center"
            >
              {cancelLabel}
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            onClick={onClose}
            autoFocus
            className="w-full justify-center mt-6"
          >
            Got it
          </Button>
        )}
      </div>
    </div>
  );
}
