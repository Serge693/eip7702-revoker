# 🔥 EIP-7702 Revoker & Delegator

Powerful and secure CLI tool to **revoke** and **delegate** EIP-7702 authorizations with a separate gas sponsor account.

---

### Features

- Revoke malicious delegations (reset to zero address)
- Delegate to any address
- Separate sponsor account for gas (recommended for security)
- Support for multiple networks simultaneously
- Automatic balance check
- User-friendly CLI

---

### Supported Networks

Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, Gnosis, Linea, Blast, Mode, Soneium, zkSync.

---

### Installation

```bash
git clone https://github.com/Serge693/eip7702-revoker.git
cd eip7702-revoker
npm install
cp .env.example .env

Then edit the .env file and add your private keys.UsageMain commands:bash

# Show help
npm run help

# Revoke on Base (default)
npm run revoke

# Revoke on specific network
npm run revoke -- --network arbitrum

# Revoke on several networks
npm run revoke -- --network base,arbitrum,optimism

# Revoke on all networks
npm run revoke:all

# Delegate examples
npm run delegate
npm run delegate -- --network base,arbitrum
npm run delegate:all

With delay between networks:bash

npm run revoke -- --network all --delay 1500

Direct commandsbash

node revoke.mjs --network all
node delegate.mjs --network base,arbitrum

Security RecommendationsAlways use a separate sponsor account with small balance
Never commit your .env file
Run the tool from a clean environment

LicenseMIT © Serge693

