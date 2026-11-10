/**
 * Turns a 1Click quote response into the fields the desk may show.
 * A dry quote must not grow a deposit address. We never fill missing numbers.
 */
export function presentQuote(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Intents returned an empty quote.");
  }
  const request = raw.quoteRequest || {};
  const quote = raw.quote;
  if (!quote || typeof quote !== "object") {
    throw new Error("Intents returned no quote object.");
  }
  const dry = request.dry === true;
  if (dry && quote.depositAddress) {
    throw new Error("Dry quote included a deposit address. Refusing to show it.");
  }
  return {
    dry,
    correlationId: typeof raw.correlationId === "string" ? raw.correlationId : null,
    amountIn: quote.amountIn ?? null,
    amountInFormatted: quote.amountInFormatted ?? null,
    amountOut: quote.amountOut ?? null,
    amountOutFormatted: quote.amountOutFormatted ?? null,
    minAmountOut: quote.minAmountOut ?? null,
    timeEstimate: quote.timeEstimate ?? null,
    depositAddress: dry ? null : quote.depositAddress || null,
    originAsset: request.originAsset || null,
    destinationAsset: request.destinationAsset || null,
  };
}
