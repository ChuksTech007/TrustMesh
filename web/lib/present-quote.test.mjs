import assert from "node:assert/strict";
import test from "node:test";
import { presentQuote } from "./present-quote.mjs";

test("dry quote keeps the correlation id and refuses a deposit address", () => {
  const shown = presentQuote({
    correlationId: "corr-1",
    quoteRequest: { dry: true, originAsset: "base", destinationAsset: "sol" },
    quote: {
      amountIn: "3360000000",
      amountInFormatted: "3360",
      amountOut: "3351000000",
      amountOutFormatted: "3351",
      minAmountOut: "3340000000",
    },
  });
  assert.equal(shown.correlationId, "corr-1");
  assert.equal(shown.amountOutFormatted, "3351");
  assert.equal(shown.depositAddress, null);
  assert.equal(shown.dry, true);
});

test("a dry quote that contains a deposit address is rejected", () => {
  assert.throws(
    () =>
      presentQuote({
        correlationId: "corr-2",
        quoteRequest: { dry: true },
        quote: { depositAddress: "0xabc", amountOutFormatted: "1" },
      }),
    /deposit address/
  );
});

test("missing quote object fails closed", () => {
  assert.throws(() => presentQuote({ correlationId: "x" }), /no quote object/);
});
