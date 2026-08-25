import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeftIcon,
  AtSignIcon,
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  KeyRoundIcon,
  ReceiptIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import Button from "../../../components/Button.component";
import Input from "../../../components/Input.component";
import IconButton from "../../../components/IconButton.component";
import SectionLabel from "../../../components/SectionLabel.component";
import AlertDialog from "../../../components/AlertDialog.component";
import LoadingScreen from "../../../components/LoadingScreen.component";
import TopBar from "../../../components/TopBar.component";
import usersService from "../../../services/users.service";
import authService from "../../../services/auth.service";
import paymentsService from "../../../services/payments.service";
import eventsService from "../../../services/events.service";
import { useAuth } from "../../../contexts/Auth.context";
import useEffectOnce from "../../../hooks/useEffectOnce.hook";
import { encodeId } from "../../../utils/idCodec.util";
import cn from "../../../utils/cn.util";

// The reference's settings line, reused here: icon + label on the left, the current
// value on the right, and a chevron only when the row opens something.
function Row({ icon, label, value, onClick, tone }) {
  const Element = onClick ? "button" : "div";

  return (
    <Element
      {...(onClick ? { type: "button", onClick } : {})}
      className={cn(
        "flex flex-row items-center justify-between gap-3 w-full bg-surface rounded-2xl px-4 py-4 text-left",
        onClick && "cursor-pointer transition-colors hover:bg-surface-strong",
        tone === "danger" && "bg-danger-soft text-danger",
      )}
    >
      <span className="flex flex-row items-center gap-3 text-[0.95rem] font-medium shrink-0">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "flex flex-row items-center gap-1.5 text-sm min-w-0",
          tone === "danger" ? "text-danger/70" : "text-muted-foreground",
        )}
      >
        <span className="truncate">{value}</span>
        {onClick ? <ChevronRightIcon size={16} className="shrink-0" /> : null}
      </span>
    </Element>
  );
}

const STATUS_TONES = {
  success: "bg-success-soft text-success",
  pending: "bg-surface-strong text-muted-foreground",
  failed: "bg-danger-soft text-danger",
};

function formatAmount(purchase) {
  const amount = Number(purchase.amount || 0);
  return `${purchase.currency || "USD"} ${amount.toFixed(2)}`;
}

function formatDate(date) {
  return date
    ? new Date(date).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
}

// One line of payment history. A purchase outlives the event it paid for (it's the
// only model with no soft delete), so a deleted event still gets a legible row.
function PurchaseRow({ purchase }) {
  const status = purchase.status || "pending";
  const eventName = purchase.event?.name || "Deleted event";
  const eventGone = !purchase.event || Boolean(purchase.event.deletedAt);

  const heading =
    status === "success" && !eventGone ? (
      <Link
        to={`/events/${encodeId(purchase.event.id)}`}
        className="font-medium truncate hover:underline"
      >
        {eventName}
      </Link>
    ) : (
      <span className="font-medium truncate">{eventName}</span>
    );

  return (
    <div className="flex flex-row items-center justify-between gap-3 bg-surface rounded-2xl px-4 py-3.5">
      <div className="flex flex-col min-w-0">
        {heading}
        <span className="text-xs text-muted-foreground mt-1">
          {formatDate(purchase.createdAt)} · {purchase.provider || "whish"}
        </span>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-[0.95rem] font-medium">
          {formatAmount(purchase)}
        </span>
        <span
          className={cn(
            "text-[0.7rem] uppercase tracking-[0.12em] rounded-full px-2 py-0.5",
            STATUS_TONES[status] || STATUS_TONES.pending,
          )}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const { user, setUser, isGuest, loading: authLoading, setOpen } = useAuth();
  const navigate = useNavigate();

  const [purchases, setPurchases] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [resetState, setResetState] = useState("idle");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffectOnce(loadPurchases);

  async function loadPurchases() {
    const response = await paymentsService.getMultiple();
    setPurchases(response.ok ? response.data : []);
  }

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Unnamed";

  function startEditingName() {
    setName(displayName === "Unnamed" ? "" : displayName);
    setEditingName(true);
  }

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Same split the sign-up sheet uses: the row keeps a first and last name, the
    // app only ever shows the pair joined back together.
    const [firstName, ...rest] = trimmed.split(/\s+/);
    const lastName = rest.join(" ");

    setSavingName(true);
    setError(null);
    const response = await usersService.update(user.id, { firstName, lastName });
    setSavingName(false);

    if (!response.ok) {
      setError(response.data?.message || "Couldn't save that name, try again.");
      return;
    }

    setUser((current) => ({ ...current, firstName, lastName }));
    setEditingName(false);
  }

  async function sendResetLink() {
    setResetState("sending");
    const response = await authService.forgotPassword(user.email);
    setResetState(response.ok ? "sent" : "idle");
    if (!response.ok) {
      setError(response.data?.message || "Couldn't send that link, try again.");
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    const response = await usersService.remove(user.id);

    if (!response.ok) {
      setDeleting(false);
      setConfirmingDelete(false);
      setError(response.data?.message || "Couldn't close the account, try again.");
      return;
    }

    // The token now points at a row every read path filters out, so drop it and let
    // the app come back up as a fresh guest rather than half signed-in. Cached event
    // payloads belong to the account that just went away.
    eventsService.invalidate();
    localStorage.removeItem("accessToken");
    window.location.replace("/");
  }

  if (authLoading) {
    return <LoadingScreen message="Opening your account…" />;
  }

  return (
    <div className="w-full min-h-dvh flex flex-col pb-14">
      <TopBar
        left={
          <IconButton onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeftIcon size={18} />
          </IconButton>
        }
      />

      <div className="px-4 pt-6">
        <h1 className="font-serif text-4xl">Account</h1>

        {isGuest ? (
          // Guests have a real backend user, just no credentials on it — there is
          // nothing to show and nothing to close until they sign in.
          <div className="flex flex-col items-start gap-4 bg-surface rounded-3xl p-6 mt-7">
            <p className="text-[0.95rem] text-muted-foreground leading-snug">
              You&apos;re shooting as a guest. Sign in to keep your events and
              photos across devices, and to see your payment history here.
            </p>
            <Button variant="primary" onClick={() => setOpen(true)}>
              Sign in
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-row items-center gap-4 mt-7">
              <span className="size-14 rounded-full bg-surface-strong flex items-center justify-center font-serif text-2xl shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="font-serif text-2xl truncate">
                  {displayName}
                </span>
                <span className="text-sm text-muted-foreground truncate">
                  {user?.email}
                </span>
              </div>
            </div>

            <SectionLabel className="mt-9 mb-4">Details</SectionLabel>

            <div className="flex flex-col gap-2.5">
              <Row
                icon={<UserIcon size={16} />}
                label="Display name"
                value={displayName}
                onClick={() =>
                  editingName ? setEditingName(false) : startEditingName()
                }
              />

              {editingName ? (
                <div className="flex flex-col gap-2.5 pb-2">
                  <Input
                    autoFocus
                    value={name}
                    placeholder="Your name"
                    onChange={(e) => setName(e.target.value)}
                  />
                  <div className="flex flex-row gap-2.5">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={saveName}
                      disabled={savingName || !name.trim()}
                    >
                      {savingName ? "Saving…" : "Save name"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingName(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              <Row
                icon={<AtSignIcon size={16} />}
                label="Email"
                value={user?.email}
              />
              <Row
                icon={<CalendarIcon size={16} />}
                label="Joined"
                value={formatDate(user?.createdAt)}
              />
            </div>

            <SectionLabel className="mt-9 mb-4">Security</SectionLabel>

            {user?.sso ? (
              <Row
                icon={<KeyRoundIcon size={16} />}
                label="Password"
                value="Managed by Google"
              />
            ) : resetState === "sent" ? (
              <div className="flex flex-row items-center gap-3 bg-success-soft border border-success-border rounded-2xl px-4 py-4 text-[0.95rem] text-success">
                <CheckIcon size={16} className="shrink-0" />
                <span className="leading-snug">
                  If that email has an account, a reset link is on its way to{" "}
                  {user.email}.
                </span>
              </div>
            ) : (
              <Row
                icon={<KeyRoundIcon size={16} />}
                label="Password"
                value={
                  resetState === "sending" ? "Sending…" : "Send a reset link"
                }
                onClick={resetState === "sending" ? undefined : sendResetLink}
              />
            )}

            <SectionLabel className="mt-9 mb-4">Payments</SectionLabel>

            {purchases === null ? (
              <LoadingScreen variant="inline" message="Finding your receipts…" />
            ) : purchases.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center bg-surface rounded-3xl">
                <ReceiptIcon size={24} className="text-subtle" />
                <p className="text-sm text-muted-foreground px-8 leading-snug">
                  No payments yet. Free events never reach checkout, so this
                  stays empty until you buy a larger one.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {purchases.map((purchase) => (
                  <PurchaseRow key={purchase.id} purchase={purchase} />
                ))}
              </div>
            )}

            <SectionLabel className="mt-9 mb-4">Danger zone</SectionLabel>

            <Row
              icon={<Trash2Icon size={16} />}
              label="Close account"
              value="Permanent"
              tone="danger"
              onClick={() => setConfirmingDelete(true)}
            />
            <p className="text-xs text-subtle mt-3 leading-snug">
              Closing your account hides it and everything you created — your
              events, your photos, and the albums your guests were sharing.
            </p>
          </>
        )}

        {error ? (
          <p className="text-sm text-danger mt-5" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <AlertDialog
        open={confirmingDelete}
        onClose={() => (deleting ? null : setConfirmingDelete(false))}
        title="Close your account?"
        message="Your events and every photo in them stop being reachable, for you and for your guests. This can't be undone from the app."
        onConfirm={deleteAccount}
        confirmLabel={deleting ? "Closing…" : "Close account"}
        confirmVariant="danger"
        cancelLabel="Keep my account"
        busy={deleting}
      />
    </div>
  );
}
