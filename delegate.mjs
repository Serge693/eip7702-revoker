// delegate.mjs

import { Command } from 'commander';
import * as cfg from './config.mjs';
import { sendEIP7702Tx } from './eip7702-utils.mjs';
import { isAddress, getAddress, zeroAddress } from 'viem';
import { networks, getNetworkByName, getNetworks } from './networks.mjs';
import pc from 'picocolors';
import readline from 'readline/promises';

const program = new Command();

program
  .name('delegate')
  .description('Delegate EIP-7702 authorization to a contract address')
  .option('-n, --network <networks>', 'Networks (comma separated) or "all"', 'ethereum')
  .option('--to <address>', 'Contract address to delegate to (overrides DELEGATE_TO in .env)')
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

async function confirmAction(delegateTo, networkNames) {
  if (opts.yes || opts.dryRun || opts.json) return true;

  console.log(pc.yellow(`\n⚠️   About to DELEGATE on ${networkNames.length} network(s):`));
  console.log(pc.cyan('    ' + networkNames.join(', ')));
  console.log(pc.yellow(`\n    Delegate target: ${delegateTo}`));
  console.log(pc.yellow('    Double-check the address — delegating to a malicious contract is dangerous.\n'));

  const answer = await rl.question('Type "yes" to continue: ');
  return answer.toLowerCase() === 'yes';
}

async function main() {
  if (!opts.json) {
    console.log(pc.bold(pc.cyan(`\n🔗 EIP-7702 Delegator v${cfg.version}\n`)));
  }

  // Адрес делегата: сначала --to, потом DELEGATE_TO из .env
  const rawDelegateTo = opts.to || cfg.DELEGATE_TO;

  if (!rawDelegateTo) {
    console.error(pc.red('❌  Delegate address required. Use --to 0x... or set DELEGATE_TO in .env'));
    process.exit(1);
  }

  if (!isAddress(rawDelegateTo)) {
    console.error(pc.red(`❌  Invalid address: ${rawDelegateTo}`));
    process.exit(1);
  }

  if (rawDelegateTo.toLowerCase() === zeroAddress) {
    console.error(pc.red('❌  Cannot delegate to zero address. Use revoke.mjs to revoke.'));
    process.exit(1);
  }

  const delegateTo = getAddress(rawDelegateTo); // checksummed

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

  // Дедупликация
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

  if (!opts.json) {
    console.log(`    Source:      ${cfg.sourceAccount.address}`);
    console.log(`    Delegate to: ${delegateTo}`);
  }

  if (!await confirmAction(delegateTo, networkNames)) {
    console.log(pc.yellow('Operation cancelled.'));
    return;
  }

  if (!opts.json) {
    console.log(pc.cyan(`\nDelegating on: ${networkNames.join(', ')}`));
  }

  // Параллельная обработка
  const tasks = selectedNetworks.map(network =>
    sendEIP7702Tx({
      network,
      sourceAccount: cfg.sourceAccount,
      sponsorAccount: cfg.sponsorAccount,
      contractAddress: delegateTo,
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
