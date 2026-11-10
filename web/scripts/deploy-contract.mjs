import fs from "fs";
import path from "path";
import { accountFrom, env, GAS } from "./near-account.mjs";

const config = env();
const wasmPath = path.resolve(
  process.cwd(),
  process.argv[2] || "../contract/target/wasm32-unknown-unknown/release/trustmesh_contract.wasm"
);
if (!config.contractId || !config.contractKey || !config.clientId) {
  console.error("Need NEAR_CONTRACT_ID, NEAR_CONTRACT_KEY (or NEAR_CLIENT_KEY), and NEAR_CLIENT_ID.");
  process.exit(1);
}
if (!fs.existsSync(wasmPath)) {
  console.error(`WASM not found at ${wasmPath}.`);
  console.error("From contract/: cargo build --target wasm32-unknown-unknown --release");
  process.exit(1);
}

const deployerId = process.env.NEAR_CONTRACT_KEY ? config.contractId : config.clientId;
const account = await accountFrom(deployerId, config.contractKey);
const wasm = fs.readFileSync(wasmPath);
const outcome = await account.deployContract(wasm);
console.log(`deployed ${wasm.length} bytes, tx ${outcome.transaction.hash}`);

await account.functionCall({
  contractId: config.contractId,
  methodName: "new",
  args: { admin: config.clientId },
  gas: GAS,
  attachedDeposit: 0n,
});
console.log(`initialized, admin ${config.clientId}`);
