# 🔥 EIP-7702 Revoker & Delegator

**Powerful CLI tool** to revoke malicious EIP-7702 delegations or delegate to a new contract with a separate gas sponsor account.

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

### Installation

```bash
git clone https://github.com/Serge693/eip7702-revoker.git
cd eip7702-revoker
npm install
cp .env.example .env

Edit the .env file and add your private keys.Usagebash

# Show help
npm run help

# Revoke examples
npm run revoke                    # on Base (default)
npm run revoke -- --network arbitrum
npm run revoke -- --network base,arbitrum,optimism
npm run revoke:all                # on all networks

# Delegate examples
npm run delegate
npm run delegate -- --network base,arbitrum
npm run delegate:all

With custom delay:bash

npm run revoke -- --network all --delay 1500

Direct commandsbash

node revoke.mjs --network all
node delegate.mjs --network base,arbitrum

Security RecommendationsAlways use a separate sponsor account with small balance
Never commit your .env file
.env is ignored by .gitignore

LicenseMIT © Serge693

