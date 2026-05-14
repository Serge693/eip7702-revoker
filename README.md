# 🔥 EIP-7702 Revoker & Delegator

Powerful and secure CLI tool to **revoke** and **delegate** EIP-7702 authorizations with a separate gas sponsor account.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![GitHub stars](https://img.shields.io/github/stars/Serge693/eip7702-revoker)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Serge693/eip7702-revoker)

---

### Features
- Revoke malicious or unwanted delegations
- Delegate to any address
- Separate **sponsor account** for gas payments (highly recommended for security)
- Support for multiple networks
- Automatic sponsor balance check
- Modern and user-friendly CLI

---

### Supported Networks
Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, Gnosis, Linea, Blast, Mode, Soneium, zkSync, and others.

---

### Installation

```bash
git clone https://github.com/Serge693/eip7702-revoker.git
cd eip7702-revoker
npm install
cp .env.example .env
Edit the .env file and add your private keys.

How EIP-7702 Revoke Works (Zero Address)
Revoke is performed by setting the delegate address to the zero address (0x0000000000000000000000000000000000000000).
According to the EIP-7702 specification:

Signing an authorization with delegate = address(0) completely removes the current delegation.
After the transaction is executed, the account returns to a normal EOA.
This is the standard and most reliable way to revoke a delegation.


Usage Examples
Revoke (main use case):
Bashnode revoke.mjs --network ethereum
Delegate:
Bashnode delegate.mjs --network base --to 0x1234567890abcdef1234567890abcdef12345678
With private keys directly:
Bashnode revoke.mjs --network arbitrum --victim-pk 0x... --sponsor-pk 0x...
Dry run:
Bashnode revoke.mjs --network ethereum --dry-run
All networks:
Bashnode revoke.mjs --network all

⚠️ Security Warning
Never commit private keys to the repository!

.env is already in .gitignore
Use a separate sponsor account with minimal ETH
For best security run on a clean/air-gapped machine


License
MIT © Serge693
