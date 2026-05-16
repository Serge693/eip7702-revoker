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

---

Edit the `.env` file and add your private keys.

---

### Usage

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

---

### Same commands work for delegate.

---

### Security Recommendations

Always use a separate sponsor account with minimal balance.

Never commit your .env file.

Consider running from a clean VM or Tails OS for maximum security.

After revoking, it is recommended to change the victim's private key.

---

### License

MIT © Serge693

### Supported Networks

Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, Gnosis, Linea, Blast, and more.

