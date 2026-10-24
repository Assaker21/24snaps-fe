import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import Button from "../../../components/Button.component";
import LoadingScreen from "../../../components/LoadingScreen.component";
import paymentsService from "../../../services/payments.service";
import eventsService from "../../../services/events.service";
import { encodeId } from "../../../utils/idCodec.util";
import { useAuth } from "../../../contexts/Auth.context";
import { useT } from "../../../contexts/I18n.context";
import useSeo from "../../../hooks/useSeo.hook";

// Where Whish sends the payer's browser back to.
//
// It deliberately does not take an event id. Events are addressed in the frontend by a
// code from a client-only codec, which the backend cannot produce — it used to build
// the return URL as `/events/<numeric id>`, and `decodeId` throws on anything that
// isn't codec-shaped, so every host who completed a payment landed on the error
// screen. This route takes the purchase id, which the server does own, and hops to the
// album once it has asked which event that purchase belongs to.
//
// It is also the page that closes the gap the provider's callback leaves: Whish
// notifies our API server-to-server, and that notification races the redirect (or
// never arrives at all). GET /payments/:id re-confirms the collect with Whish on every
// read, so polling it here settles the payment regardless of what the callback did.
const POLL_INTERVAL_MS = 2000;
const POLL_ATTEMPTS = 8;

export default function PaymentReturnPage() {
  const t = useT();
  useSeo({ title: t("pay.pageTitle") });

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();

  const purchaseId = params.get("purchaseId");
  // What Whish claims happened. Never acted on — only used to stop polling early when
  // it says the payer gave up, since there is nothing to wait for then.
  const declared = params.get("status");

  const [purchase, setPurchase] = useState(null);
  const [failed, setFailed] = useState(!purchaseId);
  const [pending, setPending] = useState(Boolean(purchaseId));
  const cancelled = useRef(false);

  useEffect(() => {
    if (authLoading || !purchaseId) return;

    cancelled.current = false;

    async function poll() {
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        const response = await paymentsService.getSingle(purchaseId);
        if (cancelled.current) return;

        if (!response.ok) {
          // A purchase that isn't ours (or doesn't exist) is not going to become ours
          // on the next try.
          if (response.status === 403 || response.status === 404) break;
        } else {
          setPurchase(response.data);

          if (response.data.paid) {
            // The event's cached payload still says unpaid; the screen we are about to
            // send them to reads that cache first.
            eventsService.invalidate(response.data.eventId);
            navigate(`/events/${encodeId(response.data.eventId)}`, {
              replace: true,
            });
            return;
          }

          if (response.data.status === "failed") break;
        }

        // Nothing to wait for if the provider already said the payer walked away.
        if (declared === "failure" && attempt >= 1) break;

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (cancelled.current) return;
      }

      if (cancelled.current) return;
      setPending(false);
      setFailed(true);
    }

    poll();

    return () => {
      cancelled.current = true;
    };
  }, [authLoading, purchaseId, declared, navigate]);

  if (authLoading || pending) {
    return <LoadingScreen message={t("pay.confirming")} />;
  }

  const eventLink = purchase?.eventId
    ? `/events/${encodeId(purchase.eventId)}`
    : "/events";

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="font-serif text-3xl">
        {failed && purchase?.status === "failed"
          ? t("pay.failedTitle")
          : t("pay.unconfirmedTitle")}
      </h1>

      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
        {purchase?.status === "failed"
          ? purchase?.eventName
            ? t("pay.failedBodyNamed", { name: purchase.eventName })
            : t("pay.failedBody")
          : t("pay.unconfirmedBody")}
      </p>

      <div className="flex flex-row gap-2.5">
        <Link to={eventLink}>
          <Button variant="primary">
            {purchase?.eventId ? t("pay.openEvent") : t("pay.myEvents")}
          </Button>
        </Link>
        {purchase?.eventId ? (
          <Link to="/events">
            <Button variant="secondary">{t("pay.myEvents")}</Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
