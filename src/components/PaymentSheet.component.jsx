import { useState } from "react";
import { CreditCardIcon, WalletIcon } from "lucide-react";
import Button from "./Button.component";
import Sheet from "./Sheet.component";
import SectionLabel from "./SectionLabel.component";
import cn from "../utils/cn.util";
import { formatPrice } from "../utils/pricing.util";

// How an event gets paid for. Whish Pay is the only processor wired up — the card
// option is listed because it is the one every host looks for first, and saying
// "currently unsupported" in place of it is more useful than leaving them to wonder
// whether we take cards at all. It stays unpressable until there is a processor
// behind it.
const METHODS = [
  {
    id: "whish",
    name: "Whish Money",
    detail: "Pay from your Whish wallet or a linked account.",
    Icon: WalletIcon,
    available: true,
  },
  {
    id: "card",
    name: "Credit card",
    detail: "Visa, Mastercard and Amex.",
    Icon: CreditCardIcon,
    available: false,
  },
];

export default function PaymentSheet({
  open,
  setOpen,
  price,
  busy,
  error,
  onConfirm,
  confirmLabel = "Continue to payment",
}) {
  const [method, setMethod] = useState("whish");

  return (
    <Sheet
      open={open}
      setOpen={setOpen}
      title="How would you like to pay?"
      description="Your event goes live the moment the payment clears."
    >
      {price != null ? (
        <div className="flex flex-row items-center justify-between border-t border-border mt-6 pt-6">
          <SectionLabel>Total</SectionLabel>
          <span className="font-serif text-3xl">{formatPrice(price)}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5 border-t border-border mt-6 pt-6">
        <SectionLabel>Payment method</SectionLabel>

        {METHODS.map(({ id, name, detail, Icon, available }) => {
          const selected = available && method === id;

          return (
            <button
              key={id}
              type="button"
              // Not merely `disabled`: an unavailable method has to stay legible and
              // announce why, rather than reading as a button that failed to load.
              disabled={!available || busy}
              aria-pressed={selected}
              onClick={() => setMethod(id)}
              className={cn(
                "flex flex-row items-center gap-3.5 w-full text-left",
                "bg-surface border border-transparent rounded-2xl px-4 py-3.5",
                "transition-[transform,background-color,border-color,color] duration-200 ease-out",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                available
                  ? "cursor-pointer active:scale-[0.98] active:duration-75"
                  : "cursor-not-allowed",
                selected && "bg-brand-soft border-brand-border text-brand",
                !available && "opacity-60",
              )}
            >
              <Icon size={20} className="shrink-0" />

              <span className="flex flex-col min-w-0">
                <span className="text-[0.95rem] font-medium">{name}</span>
                <span
                  className={cn(
                    "text-xs mt-0.5",
                    selected ? "text-brand/70" : "text-muted-foreground",
                  )}
                >
                  {available ? detail : "Currently unsupported"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-5 text-sm text-danger text-center">{error}</p>
      ) : null}

      <div className="flex justify-center mt-7">
        <Button
          // Explicit, even though the sheet renders through a portal: the wizard opens
          // it from inside its own <form>, and a default-`submit` button would be one
          // DOM move away from re-submitting the step behind it.
          type="button"
          variant="primary"
          size="lg"
          disabled={busy || !METHODS.some((m) => m.id === method && m.available)}
          onClick={() => onConfirm?.(method)}
        >
          {busy ? "Just a moment…" : confirmLabel}
        </Button>
      </div>

      <p className="text-xs text-subtle text-center mt-4">
        You'll finish paying on Whish's own secure page.
      </p>
    </Sheet>
  );
}
