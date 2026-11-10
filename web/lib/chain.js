import { connect, keyStores, KeyPair } from "near-api-js";
import { splitAmount } from "./policy";

const GAS = 50000000000000n;

export function chainConfig() {
  const networkId = process.env.NEAR_NETWORK_ID || "testnet";
  const nodeUrl =
    process.env.NEAR_NODE_URL ||
    (networkId === "mainnet" ? "https://rpc.mainnet.near.org" : "https://rpc.testnet.near.org");
  const config = {
    networkId,
    nodeUrl,
    contractId: process.env.NEAR_CONTRACT_ID || "",
    clientId: process.env.NEAR_CLIENT_ID || "",
    clientKey: process.env.NEAR_CLIENT_KEY || "",
    makerId: process.env.NEAR_MAKER_ID || "",
    makerKey: process.env.NEAR_MAKER_KEY || "",
    policyId: process.env.NEAR_POLICY_ID || "",
    policyKey: process.env.NEAR_POLICY_KEY || "",
  };
  config.configured = Boolean(config.contractId && config.clientId && config.clientKey);
  return config;
}

function signerFor(config, role) {
  if (role === "client") return { id: config.clientId, key: config.clientKey };
  if (role === "maker") return { id: config.makerId, key: config.makerKey };
  if (role === "policy") return { id: config.policyId, key: config.policyKey };
  throw new Error(`Unknown signer role ${role}.`);
}

async function nearFor(config, role) {
  const signer = signerFor(config, role);
  if (!signer.id || !signer.key) {
    throw new Error(`The ${role} account is not configured.`);
  }
  const keyStore = new keyStores.InMemoryKeyStore();
  await keyStore.setKey(config.networkId, signer.id, KeyPair.fromString(signer.key));
  const near = await connect({
    networkId: config.networkId,
    nodeUrl: config.nodeUrl,
    keyStore,
  });
  const account = await near.account(signer.id);
  return { near, account, signer };
}

async function view(config, methodName, args, account) {
  const signer = account || (await nearFor(config, "client")).account;
  const run = () =>
    signer.viewFunction({
      contractId: config.contractId,
      methodName,
      args,
    });
  try {
    return await run();
  } catch (error) {
    const message = String(error?.message || error);
    if (!/fetch failed|ECONNRESET|ETIMEDOUT|network/i.test(message)) throw error;
    return run();
  }
}

function asNumber(value) {
  if (value == null) return 0;
  if (typeof value === "object" && value !== null && "toString" in value) {
    return Number(value.toString());
  }
  return Number(value);
}

function mapMandate(raw) {
  let meta = {};
  if (raw?.metadata) {
    try {
      meta = JSON.parse(raw.metadata);
    } catch {
      meta = {};
    }
  }
  const amount = asNumber(raw.amount);
  const score = asNumber(raw.maker_score);
  const bps = asNumber(raw.bond_bps);
  const pct = bps / 100;
  const bond = Math.round(amount * pct) / 100;
  const release = Math.round((amount - bond) * 100) / 100;
  const status = String(raw.status || "").replace(/"/g, "").toLowerCase();
  return {
    id: String(raw.id),
    onChainId: asNumber(raw.id),
    title: meta.title || `Mandate ${raw.id}`,
    brief: meta.brief || "",
    amountUsd: amount,
    windowHours: Math.round(asNumber(raw.window_seconds) / 3600),
    status,
    quote: { pct, bond, release },
    nextQuote: splitAmount(amount, score),
    client: {
      name: meta.clientName || raw.client,
      place: meta.clientPlace || "Testnet",
      account: raw.client,
      chain: meta.clientChain || "Base",
      asset: meta.clientAsset || "USDC",
      kind: meta.clientKind || "studio",
    },
    maker: {
      name: meta.makerName || raw.maker,
      place: meta.makerPlace || "Testnet",
      account: raw.maker,
      chain: meta.makerChain || "Solana",
      asset: meta.makerAsset || "USDC",
      score,
      jobsCleared: meta.jobsCleared ?? null,
      kind: meta.makerKind || "person",
    },
  };
}

export function explorerTx(networkId, hash) {
  const host = networkId === "mainnet" ? "nearblocks.io" : "testnet.nearblocks.io";
  return `https://${host}/txns/${hash}`;
}

export function explorerAccount(networkId, accountId) {
  const host = networkId === "mainnet" ? "nearblocks.io" : "testnet.nearblocks.io";
  return `https://${host}/address/${accountId}`;
}

export async function readPolicyKey(config) {
  if (!config.policyId || !config.policyKey) return null;
  const pair = KeyPair.fromString(config.policyKey);
  const publicKey = pair.getPublicKey().toString();
  const { near } = await nearFor(config, "policy");
  const access = await near.connection.provider.query({
    request_type: "view_access_key",
    finality: "final",
    account_id: config.policyId,
    public_key: publicKey,
  });
  const permission = access.permission || {};
  const call = permission.FunctionCall || permission.function_call || null;
  const methodNames = call?.method_names || call?.methodNames || null;
  return {
    accountId: config.policyId,
    publicKey,
    methodNames,
    receiverId: call?.receiver_id || call?.receiverId || null,
    fullAccess: permission === "FullAccess" || Boolean(permission.FullAccess),
    explorerUrl: explorerAccount(config.networkId, config.policyId),
  };
}

export async function readDesk() {
  const config = chainConfig();
  if (!config.configured) {
    return {
      configured: false,
      reason:
        "Set NEAR_CONTRACT_ID, NEAR_CLIENT_ID, and NEAR_CLIENT_KEY in web/.env.local. The desk does not simulate a settlement.",
      networkId: config.networkId,
      jobs: [],
      policyKey: null,
    };
  }
  const { account } = await nearFor(config, "client");
  const count = asNumber(await view(config, "get_mandate_count", {}, account));
  const jobs = [];
  for (let id = 0; id < count; id += 1) {
    const raw = await view(config, "get_mandate", { mandate_id: id }, account);
    if (raw) jobs.push(mapMandate(raw));
  }
  let policyKey = null;
  try {
    policyKey = await readPolicyKey(config);
  } catch (error) {
    policyKey = { error: error.message };
  }
  return {
    configured: true,
    networkId: config.networkId,
    contractId: config.contractId,
    contractUrl: explorerAccount(config.networkId, config.contractId),
    jobs,
    policyKey,
  };
}

const CALLS = {
  fund: { method: "fund_mandate", role: "client" },
  deliver: { method: "deliver_mandate", role: "maker" },
  accept: { method: "accept_mandate", role: "client" },
  dispute: { method: "dispute_mandate", role: "client" },
  expire: { method: "expire_mandate", role: "policy" },
};

export async function actOnChain(mandateId, action) {
  const config = chainConfig();
  if (!config.configured) {
    const error = new Error("The contract is not configured.");
    error.status = 400;
    throw error;
  }
  const id = Number(mandateId);
  if (!Number.isInteger(id) || id < 0) {
    const error = new Error("Mandate id is not a number.");
    error.status = 400;
    throw error;
  }

  let method;
  let role;
  let args;
  if (action === "open_next") {
    const current = await view(config, "get_mandate", { mandate_id: id });
    if (!current) {
      const error = new Error("Mandate does not exist.");
      error.status = 404;
      throw error;
    }
    method = "open_mandate";
    role = "client";
    args = {
      maker: current.maker,
      amount: String(asNumber(current.amount)),
      maker_score: asNumber(current.maker_score),
      window_seconds: asNumber(current.window_seconds),
      metadata: current.metadata || null,
    };
  } else if (CALLS[action]) {
    method = CALLS[action].method;
    role = CALLS[action].role;
    args = { mandate_id: id };
  } else {
    const error = new Error("Unknown action.");
    error.status = 400;
    throw error;
  }

  const { account } = await nearFor(config, role);
  const outcome = await account.functionCall({
    contractId: config.contractId,
    methodName: method,
    args,
    gas: GAS,
    attachedDeposit: 0n,
  });
  const hash = outcome?.transaction?.hash || outcome?.transaction_outcome?.id || null;
  const desk = await readDesk();
  return {
    ...desk,
    lastReceipt: hash
      ? { hash, method, url: explorerTx(config.networkId, hash) }
      : { hash: null, method, url: null },
  };
}
