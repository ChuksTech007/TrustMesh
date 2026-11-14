export function usd(n) {
  return Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function usdExact(n) {
  return Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Show a yoctoNEAR string as NEAR. Uses BigInt because 1 NEAR exceeds Number.MAX_SAFE_INTEGER. */
export function formatNear(yocto) {
  const value = BigInt(yocto || 0);
  const scale = 10n ** 24n;
  const whole = value / scale;
  const frac = (value % scale).toString().padStart(24, "0").slice(0, 4).replace(/0+$/, "");
  const body = frac ? `${whole.toString()}.${frac}` : whole.toString();
  return `${body} NEAR`;
}

export function clock(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
