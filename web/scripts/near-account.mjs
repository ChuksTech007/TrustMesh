import { connect, keyStores, KeyPair } from "near-api-js";
import { loadEnv } from "./load-env.mjs";

export function env() {
  loadEnv();
  return {
    networkId: process.env.NEAR_NETWORK_ID || "testnet",
    nodeUrl: process.env.NEAR_NODE_URL || "https://rpc.testnet.near.org",
    contractId: process.env.NEAR_CONTRACT_ID || "",
    clientId: process.env.NEAR_CLIENT_ID || "",
    clientKey: process.env.NEAR_CLIENT_KEY || "",
    makerId: process.env.NEAR_MAKER_ID || "",
    makerKey: process.env.NEAR_MAKER_KEY || "",
    policyId: process.env.NEAR_POLICY_ID || "",
    policyFullKey: process.env.NEAR_POLICY_FULL_KEY || "",
    contractKey: process.env.NEAR_CONTRACT_KEY || process.env.NEAR_CLIENT_KEY || "",
  };
}

export async function accountFrom(accountId, secret) {
  const config = env();
  if (!accountId || !secret) {
    throw new Error(`Missing account id or key for ${accountId || "an unnamed account"}.`);
  }
  const keyStore = new keyStores.InMemoryKeyStore();
  await keyStore.setKey(config.networkId, accountId, KeyPair.fromString(secret));
  const near = await connect({
    networkId: config.networkId,
    nodeUrl: config.nodeUrl,
    keyStore,
  });
  return near.account(accountId);
}

export const GAS = 300000000000000n;
