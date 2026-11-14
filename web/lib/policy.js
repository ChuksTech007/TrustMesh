/**
 * Public retainage curve.
 * Must match `quote_retainage_bps` in contract/src/lib.rs:
 *   score >= 90 → 0%
 *   score >= 70 → 10%
 *   otherwise   → 30%
 * Basis points live on the contract. Percent is what the desk shows.
 */
export function bondPercent(score) {
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  if (s >= 90) return 0;
  if (s >= 70) return 10;
  return 30;
}

export function bondBps(score) {
  return bondPercent(score) * 100;
}

export function splitAmount(amountUsd, score) {
  const pct = bondPercent(score);
  const bond = Math.round(amountUsd * pct) / 100;
  const release = Math.round((amountUsd - bond) * 100) / 100;
  return { pct, bond, release };
}

/** Integer split of a yoctoNEAR amount. Matches `split_bond` in the contract. */
export function splitYocto(amountYocto, bps) {
  const amount = BigInt(amountYocto);
  const bond = (amount * BigInt(bps)) / 10000n;
  return { bond, release: amount - bond };
}

export const CURVE = [
  { label: "Prime", from: 90, to: 100, pct: 0 },
  { label: "Proven", from: 70, to: 89, pct: 10 },
  { label: "Thin record", from: 0, to: 69, pct: 30 },
];
