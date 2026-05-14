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
After the transaction is executed, the account returns to a normal EOA (Externally Owned Account).
This is the standard and most reliable way to revoke a delegation.

The tool automatically signs such an authorization from the victimAccount and sends the transaction from the sponsorAccount.

Usage Examples
Revoke delegation (main use case):
Bashnode revoke.mjs --network ethereum
Delegate to an address:
Bashnode revoke.mjs --network ethereum
Delegate to an address:
Bashnode delegate.mjs --network base --to 0x1234567890abcdef1234567890abcdef12345678
Using private keys directly (without .env):
Bashnode revoke.mjs --network arbitrum \
  --victim-pk 0x... \
  --sponsor-pk 0x...
Dry run (check without sending):
Bashnode revoke.mjs --network ethereum --dry-run
Revoke on all networks:
Bashnode revoke.mjs --network all

⚠️ Security Warning
Never commit private keys to the repository!

The .env file is already included in .gitignore
For maximum security, run this tool on a clean machine or air-gapped environment
Always use a separate sponsor account with only enough ETH for gas


Comparison with Other Tools













































ToolSeparate SponsorAll NetworksCLIOpen SourceEase of Useeip7702-revokerYesYesYesYes★★★★★cast (Foundry)Yes (manual)NoYesYes★★★revoke.cashNoNoNoNo★★★★★Built-in WalletsNoLimitedNoNo★★★★

License
MIT © Serge693
