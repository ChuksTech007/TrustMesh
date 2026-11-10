import { dryUsdcQuote } from "../lib/intents.mjs";

const amount = Number(process.argv[2] || 3360);
const quote = await dryUsdcQuote(amount);
console.log(JSON.stringify(quote, null, 2));
if (!quote.correlationId) {
  console.error("Missing correlation id");
  process.exit(1);
}
if (quote.depositAddress) {
  console.error("Dry quote returned a deposit address");
  process.exit(1);
}
if (!quote.amountOutFormatted && !quote.amountOut) {
  console.error("Dry quote returned no amount out");
  process.exit(1);
}
