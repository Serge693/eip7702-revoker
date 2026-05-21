# EIP-7702 Revoker v2

CLI tool to **revoke** (remove) or **delegate** (set) EIP-7702 authorizations on
Ethereum accounts using a **separate gas sponsor account** - so the compromised
wallet does not need to hold ETH for gas fees. Works across 12 major EVM
networks simultaneously.

## The Problem

[EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) allows EOAs to temporarily
behave like smart contracts via delegation. If a malicious actor tricks a user
into signing a delegation, they can drain the wallet. The catch is that if the
wallet has no ETH for gas, the user cannot revoke the delegation.

This tool splits the operation:
- **Source wallet** (the compromised one) signs the authorization — needs ZERO ETH
- **Sponsor wallet** broadcasts the transaction — pays gas fees

## Installation

```bash
npm install
cp .env.example .env
# Edit .env with your private keys
```

## Usage

```bash
# Revoke delegation on Base (default network)
npm run revoke

# Revoke on specific networks
npm run revoke -- --network base,ethereum,arbitrum

# Revoke on all 12 supported networks
npm run revoke:all

# Delegate to a contract
npm run delegate -- --network base --to 0xContractAddress...

# Delegate on all networks
npm run delegate:all

# Use without .env (interactive key input)
npm run start -- revoke --interactive

# Dry-run mode (simulate without broadcasting)
npm run revoke -- --dry-run

# JSON output (for scripting/automation)
npm run revoke -- --json
```

### CLI Options

| Option | Description |
|--------|-------------|
| `-n, --network <networks>` | Comma-separated network names or "all" |
| `--dry-run` | Simulate without broadcasting |
| `--rpc <url>` | Custom RPC endpoint |
| `--nonce <number>` | Manual nonce override for source account |
| `-y, --yes` | Skip confirmation prompt |
| `--json` | Output results as JSON |
| `-i, --interactive` | Prompt for keys interactively (no .env needed) |
| `--to <address>` | (delegate only) Target contract address |
| `-V, --version` | Show version number |

### Supported Networks

Ethereum, Base, Arbitrum One, OP Mainnet, Polygon, BNB Smart Chain,
Gnosis Chain, Linea, Blast, Mode, Soneium, zkSync Era

> **Note:** zkSync Era uses a different transaction model and may not support
> EIP-7702 in the standard way. Proceed with caution.

## Configuration

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `SOURCE_PRIVATE_KEY` | Private key of the wallet whose delegation to revoke/set |
| `SPONSOR_PRIVATE_KEY` | Private key of the wallet paying gas fees |
| `DELEGATE_TO` | Address to delegate to (only for delegate command) |
| `SPONSOR_MIN_BALANCE` | Minimum sponsor balance in ETH (default: 0.003) |
| `EIP7702_VERIFY_DELAY` | Delay in ms before verifying delegation (default: 3000) |
| `SILENT` | Set to 1 to suppress non-JSON output |

## Security

- The source wallet only signs — no ETH needed, no transaction broadcast from it
- The sponsor wallet should be a **separate** account with minimal ETH
- Keys are validated for format before use
- Pre-flight checks verify RPC connectivity and sponsor balance
- Dry-run mode simulates without broadcasting
- Interactive mode keeps keys in memory only

## Development

```bash
npm run typecheck   # TypeScript type checking
npm run test        # Run tests
npm run lint        # Lint source code
npm run format      # Check formatting
npm run format:fix  # Auto-fix formatting
```

## License

MIT
