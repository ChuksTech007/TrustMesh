import { accountFrom, env, GAS } from "./near-account.mjs";

const config = env();
const maker = config.makerId;
if (!config.contractId || !config.clientId || !config.clientKey || !maker) {
  console.error("Set NEAR_CONTRACT_ID, NEAR_CLIENT_ID, NEAR_CLIENT_KEY, and NEAR_MAKER_ID in web/.env.local.");
  process.exit(1);
}

const jobs = [
  {
    amount: "4800",
    score: 54,
    window: 48 * 60 * 60,
    steps: ["open"],
    meta: {
      title: "Kinetic title sequence",
      brief: "Eight seconds. Type, light, and a single cut to black. Delivery is a ProRes master.",
      clientName: "Atelier Nord",
      clientPlace: "Berlin",
      clientChain: "Base",
      makerName: "Kofi Mensah",
      makerPlace: "Accra",
      makerChain: "Solana",
      jobsCleared: 1,
    },
  },
  {
    amount: "12400",
    score: 94,
    window: 48 * 60 * 60,
    steps: ["open", "fund", "deliver", "accept"],
    meta: {
      title: "House brand film",
      brief: "A ninety-second film. The record is prime, so the curve holds nothing.",
      clientName: "Kiln & Co",
      clientPlace: "Lisbon",
      clientChain: "Ethereum",
      makerName: "Ama Boateng",
      makerPlace: "Kumasi",
      makerChain: "NEAR",
      jobsCleared: 22,
    },
  },
  {
    amount: "860",
    score: 61,
    window: 24 * 60 * 60,
    steps: ["open", "fund"],
    meta: {
      title: "Color pass, 12-second spot",
      brief: "Already funded. Deliver it, then let the window pass with the policy key.",
      clientName: "Render",
      clientPlace: "Studio",
      clientChain: "Ethereum",
      makerName: "Grade",
      makerPlace: "Desk",
      makerChain: "Solana",
      jobsCleared: 3,
    },
  },
];

const client = await accountFrom(config.clientId, config.clientKey);
const makerAccount = config.makerKey ? await accountFrom(config.makerId, config.makerKey) : null;

const count = await client.viewFunction({
  contractId: config.contractId,
  methodName: "get_mandate_count",
  args: {},
});
if (Number(count) > 0 && !process.argv.includes("--force")) {
  console.error(`Contract already has ${count} mandate(s). Re-run with --force only on a fresh contract.`);
  process.exit(1);
}

async function call(account, methodName, args) {
  const outcome = await account.functionCall({
    contractId: config.contractId,
    methodName,
    args,
    gas: GAS,
    attachedDeposit: 0n,
  });
  const hash = outcome.transaction.hash;
  console.log(`${methodName} ${hash}`);
  return hash;
}

for (const job of jobs) {
  await call(client, "open_mandate", {
    maker,
    amount: job.amount,
    maker_score: job.score,
    window_seconds: job.window,
    metadata: JSON.stringify(job.meta),
  });
  const id = Number(
    await client.viewFunction({
      contractId: config.contractId,
      methodName: "get_mandate_count",
      args: {},
    })
  ) - 1;
  if (job.steps.includes("fund")) {
    await call(client, "fund_mandate", { mandate_id: id });
  }
  if (job.steps.includes("deliver")) {
    if (!makerAccount) {
      console.error("NEAR_MAKER_KEY is required to seed a delivered mandate.");
      process.exit(1);
    }
    await call(makerAccount, "deliver_mandate", { mandate_id: id });
  }
  if (job.steps.includes("accept")) {
    await call(client, "accept_mandate", { mandate_id: id });
  }
  console.log(`seeded mandate ${id}: ${job.meta.title}`);
}
