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
import { useT } from "../../../contexts/I18n.context";
import useFormat from "../../../hooks/useFormat.hook";
import eventsService from "../../../services/events.service";
import { useAuth } from "../../../contexts/Auth.context";
import useEffectOnce from "../../../hooks/useEffectOnce.hook";
import { encodeId } from "../../../utils/idCodec.util";
import cn from "../../../utils/cn.util";
import useSeo from "../../../hooks/useSeo.hook";

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

// One line of payment history. A purchase outlives the event it paid for (it's the
// only model with no soft delete), so a deleted event still gets a legible row.
function PurchaseRow({ purchase }) {
  const t = useT();
  const fmt = useFormat();
  const status = purchase.status || "pending";
  const eventName = purchase.event?.name || t("account.deletedEvent");
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
          {purchase.createdAt ? fmt.day(purchase.createdAt) : "—"} ·{" "}
          {purchase.provider || "whish"}
        </span>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-[0.95rem] font-medium">
          {fmt.money(purchase.amount, purchase.currency || "USD")}
        </span>
        <span
          className={cn(
            "text-[0.7rem] uppercase tracking-[0.12em] rounded-full px-2 py-0.5",
            STATUS_TONES[status] || STATUS_TONES.pending,
          )}
        >
          {t(`account.status.${status}`)}
        </span>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const t = useT();
  const fmt = useFormat();
  useSeo({ title: t("account.title") });

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
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    t("account.unnamed");

  function startEditingName() {
    setName(displayName === t("account.unnamed") ? "" : displayName);
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
    const response = await usersService.update(user.id, {
      firstName,
      lastName,
    });
    setSavingName(false);

    if (!response.ok) {
      setError(response.data?.message || t("auth.displayName.error"));
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
      setError(response.data?.message || t("account.resetError"));
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    const response = await usersService.remove(user.id);

    if (!response.ok) {
      setDeleting(false);
      setConfirmingDelete(false);
      setError(
        response.data?.message || t("account.closeError"),
      );
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
    return <LoadingScreen message={t("account.loading")} />;
  }

  return (
    <div className="w-full min-h-dvh flex flex-col pb-14">
      <TopBar
        left={
          <IconButton onClick={() => navigate(-1)} aria-label={t("common.back")}>
            <ArrowLeftIcon size={18} />
          </IconButton>
        }
      />

      <div className="px-4 pt-6">
        <h1 className="font-serif text-4xl">{t("account.title")}</h1>

        {isGuest ? (
          // Guests have a real backend user, just no credentials on it — there is
          // nothing to show and nothing to close until they sign in.
          <div className="flex flex-col items-start gap-4 bg-surface rounded-3xl p-6 mt-7">
            <p className="text-[0.95rem] text-muted-foreground leading-snug">
              {t("account.guestBody")}
            </p>
            <Button variant="primary" onClick={() => setOpen(true)}>
              {t("nav.signIn")}
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

            <SectionLabel className="mt-9 mb-4">{t("account.details")}</SectionLabel>

            <div className="flex flex-col gap-2.5">
              <Row
                icon={<UserIcon size={16} />}
                label={t("account.displayName")}
                value={displayName}
                onClick={() =>
                  editingName ? setEditingName(false) : startEditingName()
                }
              />

              {editingName ? (
                <div className="flex flex-col gap-2.5 pb-2">
                  <Input
                    value={name}
                    placeholder={t("auth.displayName.placeholder")}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <div className="flex flex-row gap-2.5">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={saveName}
                      disabled={savingName || !name.trim()}
                    >
                      {savingName ? t("common.saving") : t("settings.saveName")}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingName(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              ) : null}

              <Row
                icon={<AtSignIcon size={16} />}
                label={t("account.email")}
                value={user?.email}
              />
              <Row
                icon={<CalendarIcon size={16} />}
                label={t("account.joined")}
                value={user?.createdAt ? fmt.day(user.createdAt) : "—"}
              />
            </div>

            <SectionLabel className="mt-9 mb-4">Security</SectionLabel>

            {user?.sso ? (
              <Row
                icon={<KeyRoundIcon size={16} />}
                label={t("account.password")}
                value={t("account.managedByGoogle")}
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
                label={t("account.password")}
                value={
                  resetState === "sending" ? t("account.sending") : t("account.sendReset")
                }
                onClick={resetState === "sending" ? undefined : sendResetLink}
              />
            )}

            <SectionLabel className="mt-9 mb-4">{t("account.payments")}</SectionLabel>

            {purchases === null ? (
              <LoadingScreen
                variant="inline"
                message={t("account.loadingReceipts")}
              />
            ) : purchases.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center bg-surface rounded-3xl">
                <ReceiptIcon size={24} className="text-subtle" />
                <p className="text-sm text-muted-foreground px-8 leading-snug">
                  {t("account.noPayments")}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {purchases.map((purchase) => (
                  <PurchaseRow key={purchase.id} purchase={purchase} />
                ))}
              </div>
            )}

            <SectionLabel className="mt-9 mb-4">{t("account.dangerZone")}</SectionLabel>

            <Row
              icon={<Trash2Icon size={16} />}
              label={t("account.closeAccount")}
              value={t("account.permanent")}
              tone="danger"
              onClick={() => setConfirmingDelete(true)}
            />
            <p className="text-xs text-subtle mt-3 leading-snug">
              {t("account.closeNote")}
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
        title={t("account.closeTitle")}
        message={t("account.closeBody")}
        onConfirm={deleteAccount}
        confirmLabel={deleting ? t("account.closing") : t("account.closeAccount")}
        confirmVariant="danger"
        cancelLabel={t("account.keepAccount")}
        busy={deleting}
      />
    </div>
  );
}
