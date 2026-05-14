# 🔥 EIP-7702 Revoker & Delegator

Powerful and secure CLI tool to **revoke** and **delegate** EIP-7702 authorizations with a separate gas sponsor account.

---

### Features

- Revoke malicious or unwanted delegations (reset to zero address)
- Delegate to any address
- Separate **sponsor account** for gas payments (security best practice)
- Multi-network support
- Modern CLI with flags (`--network`, `--delay`, `--all`)
- Automatic balance check and error handling

---

### Supported Networks

**Ethereum • Base • Arbitrum • Optimism • Polygon • BNB Chain • Gnosis • Linea • Blast • Mode • Soneium • zkSync**

---

### Quick Start

```bash
git clone https://github.com/Serge693/eip7702-revoker.git
cd eip7702-revoker

npm install

# Configure
cp .env.example .env
