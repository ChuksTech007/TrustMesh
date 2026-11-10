# TrustMesh

A retainage desk for one paid job. The mandate lives on a NEAR testnet contract. The release leg is a dry quote from NEAR Intents, Base USDC to Solana USDC. The key that expires a quiet window is a function-call access key whose only method is `expire_mandate`.

The bond is a public curve, not a model.

| Record | Bond |
| --- | --- |
| 90–100 | 0 bps |
| 70–89 | 1,000 bps (10%) |
| 0–69 | 3,000 bps (30%) |

`quote_retainage_bps` on the contract and `web/lib/policy.js` use the same bands. Accepting a delivery adds 17 to the record, capped at 99. A quiet window, signed by the policy key, adds 9. A dispute subtracts 12, floored at 8, and leaves the bond frozen.

US skilled freelancers earned about $1.5 trillion in a year (Upwork Future Workforce Index, 2024 data). The cross-border slice of that work still clears on wires. This desk prices the holdback before anyone sends a coin, and it does not take custody of the coin.

## Tracks

- `realworld`. A client account funds a mandate. A maker account marks it delivered. The client accepts. The release amount is priced as Solana USDC.
- `security`. `expire_mandate` is the only method on the policy key. The desk reads that method list from testnet. A full-access key is reported as full access.

## What is real, and what is not

Real:

- Contract methods in `contract/src/lib.rs`.
- A dry `POST https://1click.chaindefuser.com/v0/quote`. Asset ids are read from `GET /v0/tokens` (Base USDC, Solana USDC). `dry: true` does not return a deposit address and does not move funds. Unauthenticated quotes pay the extra 0.25% Intents fee on a live swap. This demo does not swap.
- Testnet transactions, once you deploy and fill `web/.env.local`. Each click returns a transaction hash and a testnet explorer link.

Not real:

- No mainnet transfer. No wallet popup. The click is signed by the demo keys in `.env.local`.
- "Record the mandate funded" changes contract state. It does not receive USDC. The Intents quote is the price of the release, shown beside that state.
- The circle methods still in the contract (`create_circle`, `rotate_round`) are an earlier ledger. They are not the submission.

## Run the quote with no keys

```bash
cd web
npm install
npm test
npm run dev
```

Open `http://localhost:3000/desk`. The page says the contract is not configured. Click **Price $3,360 Base USDC to Solana**.

See a correlation id, an amount in, and an amount out. See no deposit address. If Intents is down, see the error. The desk does not invent a price.

`npm test` checks that a dry quote which contains a deposit address is rejected.

## Put it on testnet

You create the accounts and the keys. Nothing in git is a key. Copy `web/.env.example` to `web/.env.local`.

1. Install Rust, then from `contract/`:

```bash
rustup target add wasm32-unknown-unknown
cargo test
cargo build --target wasm32-unknown-unknown --release
```

`cargo test` includes `test_retainage_curve_matches_the_desk`, `test_mandate_accept_reprices_the_next_bond`, and `test_silence_releases_and_dispute_freezes`. On Windows the host toolchain is MSVC, so `link.exe` has to be on PATH. That comes from Visual Studio Build Tools with the C++ workload. `nasm` also has to be on PATH, because current `near-sdk` pulls `aws-lc` for the host build. Without either one, `cargo test` stops while compiling build scripts and those three tests never run. The same host tools are required before the wasm32 release build, because build scripts still compile for the host.

2. Create three testnet accounts (client, maker, policy) and fund them from the faucet. The contract account can be the client account. Set `NEAR_CONTRACT_ID` to that account, and set `NEAR_CONTRACT_KEY` only when the contract account is a different account.

3. From `web/`:

```bash
npm run deploy
npm run policy-key
```

`policy-key` prints a new secret once. Put that secret in `NEAR_POLICY_KEY`. Leave `NEAR_POLICY_FULL_KEY` out of the running app if you want the desk to sign expires with the limited key only. The script also calls `add_operator` for the policy account.

4. `npm run seed`, then `npm run dev`.

### Do this, see that

1. Open `/desk`. See the contract account linking to testnet NearBlocks, and the policy key's method list. The list should be `expire_mandate`. If it says full access, `NEAR_POLICY_KEY` is the wrong key.
2. Open mandate 0, the title sequence, record 54, bond 30%. Click **Price the $3,360 release**. See the Intents correlation id.
3. Click **Record the mandate funded**, then **Maker delivered**, then **Client accepts**. See a transaction link. The record on the mandate is 71. The next bond shown is 10%.
4. Open the transaction on testnet NearBlocks. The method is `accept_mandate`. The desk, and `get_mandate` for that id, show `Cleared`.
5. On the color-pass mandate (funded, record 61), click **Maker delivered**, then **Let the window pass**. Expire only succeeds from Delivered. The second signer is the policy key. The record becomes 70.

## Contract methods

| Method | Signer | Effect |
| --- | --- | --- |
| `quote_retainage_bps` | anyone | 0, 1,000, or 3,000 |
| `open_mandate` | client | Stores the quote. The caller becomes the client. |
| `fund_mandate` | client or operator | Quoted to Funded |
| `deliver_mandate` | maker | Funded to Delivered |
| `accept_mandate` | client | Cleared. Score +17, cap 99 |
| `expire_mandate` | operator | Delivered to Cleared. Score +9, cap 99 |
| `dispute_mandate` | client | Disputed. Score −12, floor 8 |

Amounts on the mandate are whole dollars. The Intents quote converts the release to USDC 6-decimal units.
