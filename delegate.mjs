// delegate.mjs
import { Command } from 'commander';
import * as cfg from './config.mjs';
import { sendEIP7702Tx } from './eip7702-utils.mjs';
import { networksMap, networkAliases } from './networks.mjs';
import pc from 'picocolors';

const program = new Command();

program
  .name('delegate')
  .description('Delegate EIP-7702 authorization to a contract address')
  .option('-n, --network <networks>', 'Networks (comma separated) or "all"', 'base')
  .option('--dry-run', 'Simulate only')
  .option('--rpc <url>', 'Custom RPC URL')
  .option('--nonce <number>', 'Manual nonce')
  .option('-y, --yes', 'Skip confirmation')
  .parse();

const opts = program.opts();

async function main() {
  console.log(pc.bold(pc.magenta("\n🔄 EIP-7702 Delegator v1.4.0\n")));

  if (!cfg.DELEGATE_TO) {
    console.error(pc.red("❌ DELEGATE_TO is not set in .env"));
    process.exit(1);
  }

  let selectedNetworks = [];

  if (opts.network.toLowerCase() === 'all') {
    selectedNetworks = Object.values(networksMap);
  } else {
    const names = opts.network.toLowerCase().split(',').map(n => n.trim());
    selectedNetworks = names.map(name => {
      const normalized = networkAliases[name] || name;
      return networksMap[normalized];
    }).filter(Boolean);
  }

  if (selectedNetworks.length === 0) {
    console.error(pc.red("No valid networks selected"));
    process.exit(1);
  }

  console.log(pc.cyan(`Target networks: ${selectedNetworks.map(n => n.name).join(', ')}`));

  for (const network of selectedNetworks) {
    try {
      await sendEIP7702Tx({
        network,
        sourceAccount: cfg.sourceAccount,
        sponsorAccount: cfg.sponsorAccount,
        contractAddress: cfg.DELEGATE_TO,
        dryRun: opts.dryRun,
        customRpc: opts.rpc,
        manualNonce: opts.nonce ? Number(opts.nonce) : null
      });
    } catch (err) {
      console.error(pc.red(`   Error on ${network.name}:`), err.message);
    }
  }

  console.log(pc.green("\n🎉 All done!"));
}

main().catch(err => {
  console.error(pc.red("\n💥 Critical error:"), err.message);
  process.exit(1);
});
