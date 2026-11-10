import { KeyPair } from "near-api-js";
import { accountFrom, env, GAS } from "./near-account.mjs";

const config = env();
if (!config.contractId || !config.clientId || !config.clientKey || !config.policyId || !config.policyFullKey) {
  console.error("Need NEAR_CONTRACT_ID, NEAR_CLIENT_ID, NEAR_CLIENT_KEY, NEAR_POLICY_ID, and NEAR_POLICY_FULL_KEY.");
  console.error("NEAR_POLICY_FULL_KEY is the account's existing full-access key. It is not the key the desk should keep.");
  process.exit(1);
}

const client = await accountFrom(config.clientId, config.clientKey);
const policy = await accountFrom(config.policyId, config.policyFullKey);
const limited = KeyPair.fromRandom("ed25519");

await client.functionCall({
  contractId: config.contractId,
  methodName: "add_operator",
  args: { operator: config.policyId },
  gas: GAS,
  attachedDeposit: 0n,
});
console.log(`operator added: ${config.policyId}`);

await policy.addKey(
  limited.getPublicKey(),
  config.contractId,
  ["expire_mandate"],
  1000000000000000000000000n
);

console.log("");
console.log("Function-call key created. method_names: expire_mandate");
console.log(`public key: ${limited.getPublicKey().toString()}`);
console.log("Copy the next line into NEAR_POLICY_KEY in web/.env.local.");
console.log("Do not commit it. Do not point NEAR_POLICY_KEY at the full-access key.");
console.log(limited.toString());
