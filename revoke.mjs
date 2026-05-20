// revoke.mjs

import { Command } from 'commander';
import * as cfg from './config.mjs';
import { sendEIP7702Tx } from './eip7702-utils.mjs';
import { zeroAddress } from 'viem';
import { networks, getNetworkByName, getNetworks } from './networks.mjs';
import pc from 'picocolors';
import readline from 'readline/promises';

const program = new Command();

program
  .name('revoke')
  .description('Revoke EIP-7702 authorization (reset to zero address)')
  .option('-n, --network <networks>', 'Networks (comma separated) or "all"', 'base')
  .option('--dry-run', 'Simulate only, do not broadcast')
  .option('--rpc <url>', 'Custom RPC URL')
  .option('--nonce <number>', 'Manual nonce override')
  .option('-y, --yes', 'Skip confirmation prompt')
  .option('--json', 'Output result as JSON')
  .parse();

const opts = program.opts();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function confirmAction(networkNames) {
  if (opts.yes || opts.dryRun || opts.json) return true;

  console.log(pc.yellow(`\n⚠️   About to REVOKE EIP-7702 delegation on ${networkNames.length} network(s):`));
  console.log(pc.cyan('    ' + networkNames.join(', ')));
  console.log(pc.yellow('\n    This cannot be easily undone.\n'));

  const answer = await rl.question('Type "yes" to continue: ');
  return answer.toLowerCase() === 'yes';
}

async function main() {
  if (!opts.json) {
    console.log(pc.bold(pc.magenta(`\n🔥 EIP-7702 Revoker v${cfg.version}\n`)));
  }

  // Резолвим список сетей
  let selectedNetworks = [];

  if (opts.network.toLowerCase() === 'all') {
    selectedNetworks = getNetworks();
  } else {
    const names = opts.network.split(',').map(n => n.trim());
    selectedNetworks = names
      .map(name => getNetworkByName(name))
      .filter(Boolean);
  }

  // Дедупликация — защита от --network base,base
  selectedNetworks = [...new Map(selectedNetworks.map(n => [n.id, n])).values()];

  if (selectedNetworks.length === 0) {
    if (opts.json) {
      console.log(JSON.stringify({ success: false, error: 'no_valid_networks' }));
    } else {
      console.error(pc.red(`❌  No valid networks found for: "${opts.network}"`));
      console.error(pc.gray(`    Available: ${Object.keys(networks).join(', ')}`));
    }
    process.exit(1);
  }

  const networkNames = selectedNetworks.map(n => n.name);

  if (!await confirmAction(networkNames)) {
    console.log(pc.yellow('Operation cancelled.'));
    return;
  }

  if (!opts.json) {
    console.log(pc.cyan(`\nRevoking on: ${networkNames.join(', ')}`));
  }

  // Параллельная обработка всех сетей
  const tasks = selectedNetworks.map(network =>
    sendEIP7702Tx({
      network,
      sourceAccount: cfg.sourceAccount,
      sponsorAccount: cfg.sponsorAccount,
      contractAddress: zeroAddress,
      dryRun: opts.dryRun,
      customRpc: opts.rpc || null,
      manualNonce: opts.nonce != null ? Number(opts.nonce) : null,
      jsonOutput: opts.json,
    })
      .then(success => ({ network: network.name, chainId: network.id, success }))
      .catch(err   => ({ network: network.name, chainId: network.id, success: false, error: err.message }))
  );

  const results = (await Promise.allSettled(tasks)).map(r => r.value ?? r.reason);
  const allSuccess = results.every(r => r.success);

  if (opts.json) {
    console.log(JSON.stringify({ success: allSuccess, results }, null, 2));
  } else {
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      console.log(pc.yellow(`\n⚠️   Completed with ${failed.length} failure(s):`));
      failed.forEach(r => console.log(pc.red(`    ✗ ${r.network}: ${r.error ?? 'unknown error'}`)));
    } else {
      console.log(pc.green('\n🎉  All done!'));
    }
  }
}

main()
  .catch(err => {
    if (opts.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(pc.red('\n💥  Critical error:'), err.message);
    }
    process.exit(1);
  })
  .finally(() => rl.close());
