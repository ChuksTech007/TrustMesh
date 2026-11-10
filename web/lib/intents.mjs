import { presentQuote } from "./present-quote.mjs";

const BASE = "https://1click.chaindefuser.com";

export async function fetchTokens() {
  const response = await fetch(`${BASE}/v0/tokens`);
  if (!response.ok) {
    throw new Error(`Token list failed (${response.status}).`);
  }
  const tokens = await response.json();
  if (!Array.isArray(tokens)) {
    throw new Error("Token list was not an array.");
  }
  return tokens;
}

export function findUsdc(tokens, blockchain) {
  const want = blockchain.toLowerCase();
  const hit = tokens.find(
    (token) =>
      String(token.symbol || "").toUpperCase() === "USDC" &&
      String(token.blockchain || "").toLowerCase() === want
  );
  if (!hit?.assetId) {
    throw new Error(`No USDC asset on ${blockchain} in the Intents token list.`);
  }
  return hit;
}

export function quoteBody({ amountRaw, originAsset, destinationAsset, recipient, refundTo }) {
  const deadline = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  return {
    dry: true,
    swapType: "EXACT_INPUT",
    slippageTolerance: 100,
    originAsset,
    destinationAsset,
    amount: String(amountRaw),
    depositType: "ORIGIN_CHAIN",
    recipient,
    recipientType: "DESTINATION_CHAIN",
    refundTo,
    refundType: "ORIGIN_CHAIN",
    deadline,
  };
}

export async function dryUsdcQuote(amountUsd) {
  const dollars = Number(amountUsd);
  if (!Number.isFinite(dollars) || dollars <= 0) {
    throw new Error("Quote amount must be a positive number of dollars.");
  }
  const amountRaw = Math.round(dollars * 1_000_000);
  const tokens = await fetchTokens();
  const base = findUsdc(tokens, "base");
  const sol = findUsdc(tokens, "sol");
  const recipient =
    process.env.QUOTE_SOLANA_RECIPIENT ||
    "13QkxhNMrTPxoCkRdYdJ65tFuwXPhL5gLS2Z5Nr6gjRK";
  const refundTo =
    process.env.QUOTE_BASE_REFUND || "0x2527D02599Ba641c19FEa793cD0F167589a0f10D";
  const body = quoteBody({
    amountRaw,
    originAsset: base.assetId,
    destinationAsset: sol.assetId,
    recipient,
    refundTo,
  });
  const response = await fetch(`${BASE}/v0/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.message || payload?.error || response.statusText;
    throw new Error(`Intents quote failed (${response.status}): ${detail}`);
  }
  return presentQuote(payload);
}
