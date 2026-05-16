# 🔥 EIP-7702 Revoker & Delegator

**Powerful and secure CLI tool** to revoke and set EIP-7702 delegations with the ability to pay gas from a separate sponsor account.

> EIP-7702 allows EOAs (regular wallets) to temporarily behave like smart contracts. While powerful, it also introduces risks — malicious delegations can drain your funds. This tool helps you quickly and safely revoke them.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

## ✨ Features

- **Revoke** — reset delegation to `address(0)`
- **Delegate** — set new delegation
- **Gas Sponsor** support — your main account doesn't spend any gas (highly recommended)
- Works across **multiple networks** simultaneously
- Automatic balance checking
- Clean CLI with delay support

## 🌐 Supported Networks

**Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, Gnosis, Linea, Blast, Mode, Soneium, zkSync.**

## 📥 Installation

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

