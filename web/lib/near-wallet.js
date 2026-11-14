const GAS = "50000000000000";
export const TWO_NEAR = "2000000000000000000000000";

let connector;

async function connectorInstance() {
  if (!connector) {
    const { NearConnector } = await import("@hot-labs/near-connect");
    connector = new NearConnector({
      network: "testnet",
      features: { signAndSendTransaction: true, testnet: true },
    });
  }
  return connector;
}

export async function restoreAccount() {
  try {
    const current = await connectorInstance();
    const { accounts } = await current.getConnectedWallet();
    return accounts[0]?.accountId || "";
  } catch {
    return "";
  }
}

export async function connectAccount() {
  const current = await connectorInstance();
  const wallet = await current.connect();
  const accounts = await wallet.getAccounts();
  return accounts[0]?.accountId || "";
}

export async function disconnectAccount() {
  const current = await connectorInstance();
  const wallet = await current.wallet();
  if (wallet) await current.disconnect(wallet);
}

export async function signCall({ contractId, methodName, args, deposit }) {
  const current = await connectorInstance();
  const wallet = await current.wallet();
  if (!wallet) throw new Error("Connect a testnet wallet first.");
  const result = await wallet.signAndSendTransaction({
    receiverId: contractId,
    actions: [
      {
        type: "FunctionCall",
        params: {
          methodName,
          args,
          gas: GAS,
          deposit: deposit || "0",
        },
      },
    ],
  });
  return result?.transaction?.hash || result?.transaction_outcome?.id || null;
}
