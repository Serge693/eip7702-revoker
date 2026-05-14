# 🔥 EIP-7702 Revoker & Delegator

Powerful and secure CLI tool to **revoke** and **delegate** EIP-7702 authorizations with a separate gas sponsor account.

---

### Features

- Revoke malicious or unwanted delegations
- Delegate to any address
- Separate **sponsor account** for gas payments
- Multi-network support
- Modern CLI interface

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
Edit the .env file with your private keys.Usage CommandsCommand
Description
Example
npm run help
Show help
npm run help
npm run revoke
Revoke on Base (default)
npm run revoke
npm run revoke -- --network X
Revoke on one network
npm run revoke -- --network arbitrum
npm run revoke -- --network A,B,C
Revoke on multiple networks
npm run revoke -- --network base,arbitrum
npm run revoke:all
Revoke on all networks
npm run revoke:all
npm run delegate
Delegate on Base
npm run delegate
npm run delegate -- --network A,B
Delegate on multiple networks
npm run delegate -- --network base,arbitrum
npm run delegate:all
Delegate on all networks
npm run delegate:all

Extra Optionsbash

# With delay between networks
npm run revoke -- --network all --delay 1500

Direct usage (without npm)bash

node revoke.mjs --network all
node delegate.mjs --network base,arbitrum

SecurityUse separate sponsor account
Never commit your .env file

LicenseMIT License

