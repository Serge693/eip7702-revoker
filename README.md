# 🔥 EIP-7702 Revoker & Delegator

> CLI tool to revoke or change EIP-7702 delegations using a separate gas sponsor account — so your compromised wallet never needs to hold ETH.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![viem](https://img.shields.io/badge/viem-2.x-blue)](https://viem.sh)

---

## The Problem

[EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) lets regular wallets (EOAs) temporarily behave like smart contracts by delegating execution to a contract address. This is powerful — but if a malicious actor tricks you into signing a delegation, they can drain your wallet.

The catch: **if your wallet has no ETH for gas, you can't revoke the delegation yourself.**

This tool solves that by splitting the operation in two:

- **Source account** — the wallet with the delegation (needs zero ETH)
- **Sponsor account** — a separate wallet that pays for gas

---

## How It Works

```
Source wallet signs authorization  →  Sponsor broadcasts the transaction
     (no ETH needed)                        (pays gas)
```

Revoking = setting the delegation target to `0x0000000000000000000000000000000000000000`.

The tool uses [viem's `signAuthorization`](https://viem.sh/experimental/eip7702/signAuthorization) which correctly implements the EIP-7702 signing spec (RLP encoding + `0x05` magic prefix).

---

## Supported Networks

| Network | Alias |
|---|---|
| Ethereum | `ethereum`, `eth`, `mainnet` |
| Base | `base` |
| Arbitrum One | `arbitrum`, `arb` |
| OP Mainnet | `optimism`, `op` |
| Polygon | `polygon`, `matic` |
| BNB Smart Chain | `bsc`, `bnb`, `BNB Chain` |
| Gnosis | `gnosis`, `xdai` |
| Linea | `linea` |
| Blast | `blast` |
| Mode | `mode` |
| Soneium | `soneium` |
| zkSync Era | `zksync` |

---

## Installation

```bash
git clone https://github.com/Serge693/eip7702-revoker.git
cd eip7702-revoker
npm install
cp .env.example .env
```

Then edit `.env` with your private keys:

```env
# Wallet with the delegation (can have zero ETH)
SOURCE_PRIVATE_KEY=0x...

# Separate wallet that pays for gas (needs small ETH balance)
SPONSOR_PRIVATE_KEY=0x...
```

> ⚠️ Never commit `.env` to git. It's already in `.gitignore`.

---

## Usage

### Revoke delegation

```bash
# Single network
npm run revoke -- --network base

# Multiple networks at once
npm run revoke -- --network arbitrum,polygon,bsc

# All supported networks
npm run revoke:all
```

### Delegate to a contract

```bash
npm run delegate -- --network base
```

### Dry run (simulate without broadcasting)

```bash
npm run revoke -- --network ethereum --dry-run
```

### JSON output (for scripting/automation)

```bash
npm run revoke -- --network base --json
```

### Custom RPC

```bash
npm run revoke -- --network base --rpc https://your-custom-rpc.example.com
```

### Manual nonce override

```bash
npm run revoke -- --network base --nonce 42
```

---

## How the Script Works (step by step)

1. **Checks delegation status** — reads bytecode at the source address. EIP-7702 delegation code starts with `0xef0100`.
2. **Skips if clean** — if no delegation is found, the network is skipped automatically.
3. **Signs authorization** — source account signs `keccak256(0x05 || rlp([chainId, contractAddress, nonce]))` locally.
4. **Estimates gas** — adds a 35% buffer to the estimated gas limit.
5. **Broadcasts via sponsor** — sponsor wallet sends the EIP-7702 type transaction.
6. **Waits for confirmation** — polls for receipt with a 90-second timeout.
7. **Verifies result** — reads bytecode again to confirm delegation was removed.
8. **Retries on failure** — up to 3 attempts with 2.5s delay between them.

---

## Security Recommendations

**Sponsor wallet:**
- Keep a minimal balance (0.005–0.05 ETH per network is usually enough)
- Use a dedicated throwaway wallet, not your main account
- Never reuse the sponsor key for anything else

**Private keys:**
- Store `.env` outside the project directory if possible
- Consider using a hardware wallet + export flow for the source key
- Delete the key from `.env` after use

**Before revoking:**
- Confirm the delegation is actually malicious — check on [eip7702.app](https://eip7702.app)
- Use `--dry-run` first to simulate

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `No active delegation` | Address is already clean | Nothing to do |
| `insufficient funds` | Sponsor has no ETH | Top up sponsor wallet |
| `nonce too low` | Pending transaction conflict | Use `--nonce` to override |
| `timeout` after 90s | Network congestion | Re-run, transaction may still confirm |
| `replacement fee too low` | Stuck transaction | Wait or use `--nonce` with higher fee |

---

## Useful Links

- [EIP-7702 Specification](https://eips.ethereum.org/EIPS/eip-7702)
- [eip7702.app](https://eip7702.app) — check delegation status
- [Revoke.cash](https://revoke.cash) — check token approvals
- [viem EIP-7702 docs](https://viem.sh/experimental/eip7702)

---

## License

MIT © [Serge693](https://github.com/Serge693)
