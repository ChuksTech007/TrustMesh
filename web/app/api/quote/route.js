import { dryUsdcQuote } from "@/lib/intents.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const quote = await dryUsdcQuote(body.amountUsd);
    return Response.json({ quote });
  } catch (error) {
    return Response.json(
      { error: error.message || "The quote could not be fetched." },
      { status: 400 }
    );
  }
}
