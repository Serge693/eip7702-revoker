# 🔥 EIP-7702 Revoker & Delegator

**Powerful and secure CLI tool** to revoke and set EIP-7702 delegations with the ability to pay gas from a separate sponsor account.

> EIP-7702 allows EOAs (regular wallets) to temporarily behave like smart contracts. While powerful, it also introduces risks — malicious delegations can drain your funds. This tool helps you quickly and safely revoke them.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

## Features

- Separate sponsor account for gas
- Revoke (reset to zero address) or delegate
- Multi-network support (including L2s)
- `--dry-run` mode
- Dynamic gas estimation + retry logic
- Current delegation status check
- Custom RPC support
- Colorful and informative output

## Installation

```bash
git clone https://github.com/Serge693/eip7702-revoker.git
cd eip7702-revoker
npm install
cp .env.example .env

```
---

# Edit .env with your private keys.

## Usage

```bash
# Help
npm run help

# Revoke on Base only
npm run revoke

# Revoke on multiple networks
npm run revoke -- --network base,arbitrum,optimism

# Revoke on all supported networks
npm run revoke:all

# Dry run
npm run revoke -- --network all --dry-run

# With custom RPC
npm run revoke -- --network base --rpc https://your-rpc.com

```

# Same commands work for delegate.

---

## Security Recommendations

Always use a separate sponsor account with minimal balance (0.01–0.1 ETH recommended).

Never commit your .env file to git.

Store private keys securely (hardware wallet preferred).

Verify that a delegation is actually malicious before mass-revoking.

After revoking, check your status on eip7702.app or in your wallet.

---

## How It Works

The tool signs an EIP-7702 authorization from your main account and broadcasts the setCode transaction through the sponsor account. This way your main account spends zero gas and stays protected.Revoke = setting delegation to 0x0000000000000000000000000000000000000000.

---

## Useful Links

EIP-7702 Specification

Revoke.cash — check token approvals and delegations

eip7702.app

---

## License

MIT © Serge693

