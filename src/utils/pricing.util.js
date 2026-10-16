// The tier table the wizard prices an event from. Mirrors the backend's
// `src/config/pricing.js`, which is the authority — price is computed there from the
// event row and never taken from the client. These two have to agree, or the wizard
// quotes one number and checkout charges another.
export const PARTICIPANT_PLANS = [
  { id: 1, number: 5, price: 0 },
  { id: 2, number: 10, price: 1.99 },
  { id: 3, number: 25, price: 4.99 },
  { id: 4, number: 50, price: 14.99 },
  { id: 5, number: 100, price: 29.99 },
  { id: 6, number: 150, price: 49.99 },
  { id: 7, number: 200, price: 69.99 },
  { id: 8, number: -1, price: 99.99 },
];

// Unlimited shots roughly doubles the tier, and turns the free tier into the cheapest
// paid one. Same formula as the server's.
export function withUnlimitedShots(price) {
  if (!price) return 1.99;
  return Math.floor(price * 2) + 0.99;
}

// `shotsPerPerson` of -1 is the wizard's "unlimited".
export function computePrice({ planId, shotsPerPerson }) {
  const plan =
    PARTICIPANT_PLANS.find((p) => p.id === planId) || PARTICIPANT_PLANS[0];
  const price =
    shotsPerPerson === -1 ? withUnlimitedShots(plan.price) : plan.price;
  return Math.round(price * 100) / 100;
}

export function formatPrice(price) {
  return price ? `US$${price.toFixed(2)}` : "Free";
}
