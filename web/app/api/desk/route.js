import { actOnChain, readDesk } from "@/lib/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await readDesk());
  } catch (error) {
    return Response.json(
      { readFailed: true, jobs: [], error: error.message || "Could not read the contract." },
      { status: 502 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const desk = await actOnChain(body.id, body.action);
    return Response.json(desk);
  } catch (error) {
    return Response.json(
      { error: error.message || "The contract call failed." },
      { status: error.status || 500 }
    );
  }
}
