import { connect, keyStores, KeyPair } from "near-api-js";
import { bondBps, bondPercent, splitAmount, splitYocto } from "./policy";

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
  config.configured = Boolean(config.contractId);
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

function asNumber(value) {
  if (value == null) return 0;
  if (typeof value === "object" && value !== null && "toString" in value) {
    return Number(value.toString());
  }
  return Number(value);
}

function asString(value) {
  if (value == null) return "0";
  return String(value);
}

async function rpcView(config, methodName, args) {
  const body = {
    jsonrpc: "2.0",
    id: "trustmesh",
    method: "query",
    params: {
      request_type: "call_function",
      finality: "final",
      account_id: config.contractId,
      method_name: methodName,
      args_base64: Buffer.from(JSON.stringify(args ?? {})).toString("base64"),
    },
  };
  const run = async () => {
    const res = await fetch(config.nodeUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) {
      const detail = data.error.data || data.error.message || "The contract view failed.";
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
    const bytes = data.result?.result;
    if (!bytes) return null;
    const text = Buffer.from(bytes).toString("utf8");
    if (!text) return null;
    return JSON.parse(text);
  };
  try {
    return await run();
  } catch (error) {
    const message = String(error?.message || error);
    if (!/fetch failed|ECONNRESET|ETIMEDOUT|network/i.test(message)) throw error;
    return run();
  }
}

function mapMandate(raw, escrowYocto) {
  let meta = {};
  if (raw?.metadata) {
    try {
      meta = JSON.parse(raw.metadata);
    } catch {
      meta = {};
    }
  }
  const amountStr = asString(raw.amount);
  const yocto = meta.unit === "yocto" || amountStr.length > 15;
  const score = asNumber(raw.maker_score);
  const bps = asNumber(raw.bond_bps);
  const pct = bps / 100;
  const status = String(raw.status || "").replace(/"/g, "").toLowerCase();
  let amountUsd = null;
  let quote;
  let nextQuote;
  if (yocto) {
    const parts = splitYocto(amountStr, bps);
    const next = splitYocto(amountStr, bondBps(score));
    quote = { pct, bond: parts.bond.toString(), release: parts.release.toString() };
    nextQuote = {
      pct: bondPercent(score),
      bond: next.bond.toString(),
      release: next.release.toString(),
    };
  } else {
    const amount = Number(amountStr);
    amountUsd = Number.isFinite(amount) ? amount : 0;
    const bond = Math.round(amountUsd * pct) / 100;
    const release = Math.round((amountUsd - bond) * 100) / 100;
    quote = { pct, bond, release };
    nextQuote = splitAmount(amountUsd, score);
  }
  return {
    id: String(raw.id),
    onChainId: asNumber(raw.id),
    title: meta.title || `Mandate ${raw.id}`,
    brief: meta.brief || "",
    yocto,
    amountYocto: yocto ? amountStr : null,
    amountUsd,
    escrowYocto: asString(escrowYocto || "0"),
    metadata: raw.metadata || null,
    windowSeconds: asNumber(raw.window_seconds),
    windowHours: Math.round(asNumber(raw.window_seconds) / 3600),
    status,
    quote,
    nextQuote,
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
        "Set NEAR_CONTRACT_ID in web/.env.local. The desk does not simulate a settlement.",
      networkId: config.networkId,
      jobs: [],
      policyKey: null,
    };
  }
  const count = asNumber(await rpcView(config, "get_mandate_count", {}));
  const jobs = [];
  for (let id = 0; id < count; id += 1) {
    const raw = await rpcView(config, "get_mandate", { mandate_id: id });
    if (!raw) continue;
    let escrow = "0";
    try {
      escrow = asString(await rpcView(config, "get_escrow", { mandate_id: id }));
    } catch (error) {
      const message = String(error?.message || error);
      if (!/method not found|unknown method|MethodNotFound/i.test(message)) throw error;
    }
    jobs.push(mapMandate(raw, escrow));
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
    clientId: config.clientId,
    makerId: config.makerId,
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

const WALLET_ONLY = new Set(["fund", "deliver", "accept", "dispute", "open_next"]);

export async function actOnChain(mandateId, action) {
  if (WALLET_ONLY.has(action)) {
    const error = new Error(
      "Sign this step in a testnet wallet. The server only signs expire_mandate."
    );
    error.status = 400;
    throw error;
  }
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

  if (!CALLS[action] || CALLS[action].role !== "policy") {
    const error = new Error("Unknown action.");
    error.status = 400;
    throw error;
  }
  const method = CALLS[action].method;
  const role = CALLS[action].role;
  const args = { mandate_id: id };

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
