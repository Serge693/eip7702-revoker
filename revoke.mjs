// revoke.mjs
import { Command } from 'commander';
import * as cfg from './config.mjs';
import { sendEIP7702Tx } from './eip7702-utils.mjs';
import { zeroAddress } from 'viem';
import { networksMap, networkAliases } from './networks.mjs';
import pc from 'picocolors';
import readline from 'readline/promises';

const program = new Command();

program
  .name('revoke')
  .description('Revoke EIP-7702 authorization (reset to zero address)')
  .option('-n, --network <networks>', 'Networks (comma separated) or "all"', 'base')
  .option('--dry-run', 'Simulate only')
  .option('--rpc <url>', 'Custom RPC URL')
  .option('--nonce <number>', 'Manual nonce')
  .option('-y, --yes', 'Skip all confirmations')
  .option('--json', 'Output result as JSON')
  .parse();

const opts = program.opts();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function confirmAction(networkNames) {
  if (opts.yes || opts.dryRun || opts.json) return true;

  console.log(pc.yellow(`\n⚠️  You are about to REVOKE EIP-7702 delegation on ${networkNames.length} network(s):`));
  console.log(pc.cyan(networkNames.join(', ')));
  console.log(pc.yellow("\nThis action cannot be easily undone.\n"));

  const answer = await rl.question('Type "yes" to continue: ');
  rl.close();
  return answer.toLowerCase() === 'yes';
}

async function main() {
  if (!opts.json) {
    console.log(pc.bold(pc.magenta("\n🔥 EIP-7702 Revoker v1.4.0\n")));
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
    if (opts.json) console.log(JSON.stringify({ success: false, error: "no_valid_networks" }));
    else console.error(pc.red("No valid networks selected"));
    process.exit(1);
  }

  const networkNames = selectedNetworks.map(n => n.name);

  if (!await confirmAction(networkNames)) {
    console.log(pc.yellow("Operation cancelled by user."));
    process.exit(0);
  }

  if (!opts.json) {
    console.log(pc.cyan(`Starting revocation on ${networkNames.join(', ')}`));
  }

  // === Конкурентная обработка ===
  const tasks = selectedNetworks.map(network =>
    sendEIP7702Tx({
      network,
      sourceAccount: cfg.sourceAccount,
      sponsorAccount: cfg.sponsorAccount,
      contractAddress: zeroAddress,
      dryRun: opts.dryRun,
      customRpc: opts.rpc,
      manualNonce: opts.nonce ? Number(opts.nonce) : null,
      jsonOutput: opts.json
    }).then(success => ({ network: network.name, success }))
      .catch(err => ({
        network: network.name,
        success: false,
        error: err.message
      }))
  );

  const results = await Promise.allSettled(tasks);
  const finalResults = results.map(r => r.value || r.reason);

  if (opts.json) {
    console.log(JSON.stringify({
      success: finalResults.every(r => r.success),
      results: finalResults
    }));
  } else {
    console.log(pc.green("\n🎉 All done!"));
  }
}

main().catch(err => {
  if (opts.json) {
    console.log(JSON.stringify({ success: false, error: err.message }));
  } else {
    console.error(pc.red("\n💥 Critical error:"), err.message);
  }
  process.exit(1);
});
