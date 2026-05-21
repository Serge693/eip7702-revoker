# EIP-7702 Revoker

CLI tool to **revoke** (remove) or **delegate** (set) EIP-7702 authorizations on
Ethereum accounts using a **separate gas sponsor account** — so the compromised
wallet does not need to hold ETH for gas fees. Works across 12 major EVM
networks simultaneously.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## The Problem

[EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) lets regular wallets (EOAs)
temporarily behave like smart contracts by delegating execution to a contract
address. This is powerful — but if a malicious actor tricks you into signing a
delegation, they can drain your wallet.

The catch: **if your wallet has no ETH for gas, you can't revoke the delegation
yourself.**

This tool splits the operation:
- **Source wallet** (the compromised one) signs the authorization — needs ZERO ETH
- **Sponsor wallet** broadcasts the transaction — pays gas fees

---

## Installation

```bash
git clone https://github.com/Serge693/eip7702-revoker.git
cd eip7702-revoker
npm install
cp .env.example .env
# Edit .env with your private keys
```

## Usage

```bash
# Revoke delegation on Base (default network)
npm run revoke

# Revoke on specific networks
npm run revoke -- --network base,ethereum,arbitrum

# Revoke on all 12 supported networks
npm run revoke:all

# Delegate to a contract
npm run delegate -- --network base --to 0xContractAddress...

# Delegate on all networks
npm run delegate:all

# Use without .env (interactive key input — tool prompts for keys)
npm run revoke -- --interactive

# Or directly with tsx (if you prefer)
npx tsx src/main.ts revoke --interactive

# Dry-run mode (simulate without broadcasting)
npm run revoke -- --dry-run

# JSON output (for scripting/automation)
npm run revoke -- --json
```

### CLI Options

| Option | Description |
|--------|-------------|
| `-n, --network <networks>` | Comma-separated network names or "all" |
| `--dry-run` | Simulate without broadcasting |
| `--rpc <url>` | Custom RPC endpoint |
| `--nonce <number>` | Manual nonce override for source account |
| `-y, --yes` | Skip confirmation prompt |
| `--json` | Output results as JSON |
| `-i, --interactive` | Prompt for keys interactively (no .env needed) |
| `--to <address>` | (delegate only) Target contract address |
| `-V, --version` | Show version number |

### Supported Networks

| Network | Chain ID | Alias |
|---------|----------|-------|
| Ethereum | 1 | `eth`, `mainnet` |
| Base | 8453 | `base` |
| Arbitrum One | 42161 | `arb` |
| OP Mainnet | 10 | `op` |
| Polygon | 137 | `matic` |
| BNB Smart Chain | 56 | `bnb` |
| Gnosis Chain | 100 | `xdai` |
| Linea | 59144 | `linea` |
| Blast | 81457 | `blast` |
| Mode | 34443 | `mode` |
| Soneium | 1868 | `soneium` |
| zkSync Era | 324 | `zksync` |

> **Note:** zkSync Era uses a different transaction model and may not support
> EIP-7702 in the standard way. Proceed with caution.

## Configuration

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `SOURCE_PRIVATE_KEY` | Private key of the wallet whose delegation to revoke/set |
| `SPONSOR_PRIVATE_KEY` | Private key of the wallet paying gas fees |
| `DELEGATE_TO` | Address to delegate to (only for delegate command) |
| `SPONSOR_MIN_BALANCE` | Minimum sponsor balance in ETH (default: 0.003) |
| `EIP7702_VERIFY_DELAY` | Delay in ms before verifying delegation (default: 3000) |
| `SILENT` | Set to 1 to suppress non-JSON output |

## Security

- The source wallet only signs — no ETH needed, no transaction broadcast from it
- The sponsor wallet should be a **separate** account with minimal ETH
- Keys are validated for format before use
- Pre-flight checks verify RPC connectivity and sponsor balance
- Dry-run mode simulates without broadcasting
- Interactive mode keeps keys in memory only

## Development

```bash
npm run typecheck   # TypeScript type checking
npm run test        # Run tests
npm run lint        # Lint source code
npm run format      # Check formatting
npm run format:fix  # Auto-fix formatting
```

## Changelog

### v2.0.0 (2026-05-21)

- Rewritten in TypeScript (all `.mjs` → `.ts`)
- Added test suite (vitest, 9 tests)
- Added ESLint + Prettier for code quality
- Added `--interactive` flag for key input without `.env`
- Added pre-flight checks: RPC health, sponsor balance
- Added zkSync compatibility warning
- `MIN_SPONSOR_BALANCE` is now enforced before sending
- `EIP7702_VERIFY_DELAY` is configurable via `.env`
- Added `SILENT` env var documentation
- All output and comments are in English

### v1.4.1 (2026-05-19)

- Last stable JavaScript release
- Available on the `v1.4.1` tag

## Contributing

Contributions are welcome! Here's how to help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run tests (`npm test`) and lint (`npm run lint`)
5. Commit and push
6. Open a Pull Request

Please ensure your code follows the existing style and all tests pass.

## License

MIT © [Serge693](https://github.com/Serge693)
