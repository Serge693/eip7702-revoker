# 🔥 EIP-7702 Revoker & Delegator

Powerful and secure CLI tool to **revoke** and **delegate** EIP-7702 authorizations with a separate gas sponsor account.

---

### Features

- Revoke malicious or unwanted delegations (reset to zero address)
- Delegate to any address
- Separate **sponsor account** for gas payments (highly recommended)
- Support for multiple networks at once
- Automatic sponsor balance check
- Modern and user-friendly CLI

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

Security RecommendationsAlways use a separate sponsor account with minimal balance
Never commit your .env file
.env is already ignored by .gitignore

LicenseMIT © Serge693
`docs: clean up README.md`
