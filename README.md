# TrustMesh

A retainage desk for one paid job. The mandate lives on a NEAR testnet contract. A new mandate locks faucet testnet NEAR. Delivery pays the unbonded slice to the maker. Accept, or the policy key, pays the bond that stayed. The NEAR Intents card is a dry quote from Base USDC to Solana USDC. It does not move USDC. The key that expires a quiet window is a function-call access key whose only method is `expire_mandate`.

The bond is a public curve, not a model.

| Record | Bond |
| --- | --- |
| 90–100 | 0 bps |
| 70–89 | 1,000 bps (10%) |
| 0–69 | 3,000 bps (30%) |

`quote_retainage_bps` on the contract and `web/lib/policy.js` use the same bands. Accepting a delivery adds 17 to the record, capped at 99. A quiet window, signed by the policy key, adds 9. A dispute subtracts 12, floored at 8, and leaves the bond frozen.

US skilled freelancers earned about $1.5 trillion in a year (Upwork Future Workforce Index, 2024 data). The cross-border slice of that work still clears on wires. This desk prices the holdback before anyone sends a coin. On a new mandate the contract holds faucet testnet NEAR and pays the maker from that balance. It does not hold USDC.

## Tracks

- `realworld`. A client wallet locks faucet NEAR on a mandate. A maker wallet marks it delivered and receives the unbonded slice. The client accepts, and the remaining bond is paid in NEAR. A dry Intents quote prices a USDC release and does not move USDC.
- `security`. `expire_mandate` is the only method on the policy key. The desk reads that method list from testnet. A full-access key is reported as full access.

## What is real, and what is not

Real:

- Contract methods in `contract/src/lib.rs`. `fund_mandate` is payable. The attached deposit must equal the mandate amount in yoctoNEAR. Delivery transfers the unbonded slice to the maker. Accept and expire transfer whatever escrow remains. Dispute leaves the bond in the contract.
- A visitor signs open, fund, deliver, accept, and dispute in a testnet wallet (`@hot-labs/near-connect`). The server signs only `expire_mandate`, with the limited policy key.
- A dry `POST https://1click.chaindefuser.com/v0/quote`. Asset ids are read from `GET /v0/tokens` (Base USDC, Solana USDC). `dry: true` does not return a deposit address and does not move funds. Unauthenticated quotes pay the extra 0.25% Intents fee on a live swap. This demo does not swap.
- Testnet transactions. A wallet click returns a transaction hash and a testnet explorer link. Expire does the same from the policy key.

Not real:

- No mainnet. No USDC movement. The Intents card is a price.
- Mandates opened before the escrow upgrade are dollar records. That includes mandates 0, 1, and 2, and any later copy opened from them. Their amounts are whole dollars, their escrow is zero, and the desk does not ask a wallet to fund them.
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

`npm run deploy` deploys the wasm and calls `migrate`. It does not call `new`. `new` on a contract that already has mandates wipes that state. `migrate` adds the escrow map and leaves existing mandates in place. A second `migrate` reads the current layout and does not empty escrow.

`policy-key` prints a new secret once. Put that secret in `NEAR_POLICY_KEY`. Leave `NEAR_POLICY_FULL_KEY` out of the running app if you want the desk to sign expires with the limited key only. The script also calls `add_operator` for the policy account. Do not run it again unless that limited key is lost.

4. `npm run seed` only when `get_mandate_count` is 0. If mandates already exist, the script exits. Then `npm run dev`.

Import the client and maker testnet accounts into a testnet wallet such as Meteor or Intear. Use one browser profile for the client and another for the maker. The desk never asks for the secret. Do not paste a private key into the site.

### Do this, see that

1. Open `/desk`. See the contract account linking to testnet NearBlocks, and the policy key's method list. The list should be `expire_mandate`. If it says full access, `NEAR_POLICY_KEY` is the wrong key.
2. Open mandate 0. It is a cleared dollar record and the page says the contract holds no NEAR for it. Click **Price the $3,360 release**. See an Intents correlation id and no deposit address.
3. Click **Connect testnet wallet** and approve with the client account. Click **Open a 2 NEAR job**. The new mandate is quoted, record 54, bond 30%, fee 2 NEAR.
4. Click **Lock 2 NEAR** and approve the wallet. The attached deposit is 2 NEAR. The status becomes Funded. The contract holds 2 NEAR.
5. In the other profile, connect the maker account named on the job. Click **Maker delivered**. The maker receives 1.4 NEAR. The contract still holds 0.6 NEAR.
6. Connect the client account again. Click **Client accepts**. The maker receives the remaining 0.6 NEAR. The record becomes 71. The next bond shown is 10%. The NearBlocks receipt method is `accept_mandate`.
7. To see the policy key, open another 2 NEAR job, fund it, deliver it, then click **Let the window pass**. That click is signed by the server policy key, not the wallet. The record climbs by 9. Do not fund mandates 0, 1, or 2. Their amounts are dollar labels, not yoctoNEAR.

## Contract methods

| Method | Signer | Effect |
| --- | --- | --- |
| `quote_retainage_bps` | anyone | 0, 1,000, or 3,000 |
| `open_mandate` | client | Stores the quote. The caller becomes the client. |
| `fund_mandate` | client or operator | Payable. Attached yoctoNEAR must equal the amount. Quoted to Funded. |
| `deliver_mandate` | maker | Pays the unbonded slice to the maker. Funded to Delivered. |
| `accept_mandate` | client | Pays the remaining escrow to the maker. Cleared. Score +17, cap 99. |
| `expire_mandate` | operator | Pays the remaining escrow to the maker. Delivered to Cleared. Score +9, cap 99. |
| `dispute_mandate` | client | Disputed. Score −12, floor 8. The bond stays in the contract. |
| `get_escrow` | anyone | YoctoNEAR still held for that mandate. |
| `migrate` | contract account | Adds the escrow map. Does not wipe it on a second call. |

A new mandate stores its fee as yoctoNEAR and sets `metadata.unit` to `"yocto"`. Mandates opened before that change store whole dollar amounts and have no unit. The Intents quote is a USDC price of a labeled release. It is not the payout.
