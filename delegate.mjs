// delegate.mjs
import { Command } from 'commander';
import * as cfg from './config.mjs';
import { sendEIP7702Tx } from './eip7702-utils.mjs';
import { networksMap, networkAliases } from './networks.mjs';
import pc from 'picocolors';
import readline from 'readline/promises';

const program = new Command();

program
  .name('delegate')
  .description('Delegate EIP-7702 authorization to a contract address')
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

async function confirmAction(networkNames, delegateTo) {
  if (opts.yes || opts.dryRun || opts.json) return true;

  console.log(pc.yellow(`\n⚠️  You are about to DELEGATE EIP-7702 authorization to:`));
  console.log(pc.cyan(`   ${delegateTo}`));
  console.log(pc.yellow(`\nOn ${networkNames.length} network(s):`));
  console.log(pc.cyan(networkNames.join(', ')));
  console.log(pc.yellow("\nThis action is significant and cannot be easily undone.\n"));

  const answer = await rl.question('Type "yes" to continue: ');
  rl.close();
  return answer.toLowerCase() === 'yes';
}

async function main() {
  if (!opts.json) {
    console.log(pc.bold(pc.magenta("\n🔄 EIP-7702 Delegator v1.4.0\n")));
  }

  if (!cfg.DELEGATE_TO) {
    if (opts.json) {
      console.log(JSON.stringify({ success: false, error: "DELEGATE_TO_not_set" }));
    } else {
      console.error(pc.red("❌ DELEGATE_TO is not set in .env"));
    }
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
    if (opts.json) console.log(JSON.stringify({ success: false, error: "no_valid_networks" }));
    else console.error(pc.red("No valid networks selected"));
    process.exit(1);
  }

  const networkNames = selectedNetworks.map(n => n.name);

  // Запрос подтверждения
  if (!await confirmAction(networkNames, cfg.DELEGATE_TO)) {
    console.log(pc.yellow("Operation cancelled by user."));
    process.exit(0);
  }

  if (!opts.json) {
    console.log(pc.cyan(`Target networks: ${networkNames.join(', ')}`));
    console.log(pc.cyan(`Delegate target: ${cfg.DELEGATE_TO}`));
  }

  const results = [];

  for (const network of selectedNetworks) {
    try {
      const success = await sendEIP7702Tx({
        network,
        sourceAccount: cfg.sourceAccount,
        sponsorAccount: cfg.sponsorAccount,
        contractAddress: cfg.DELEGATE_TO,
        dryRun: opts.dryRun,
        customRpc: opts.rpc,
        manualNonce: opts.nonce ? Number(opts.nonce) : null,
        jsonOutput: opts.json
      });

      results.push({ network: network.name, success });
    } catch (err) {
      const errorMsg = err.message || 'Unknown error';
      if (opts.json) {
        console.log(JSON.stringify({ network: network.name, success: false, error: errorMsg }));
      } else {
        console.error(pc.red(`   Error on ${network.name}:`), errorMsg);
      }
      results.push({ network: network.name, success: false, error: errorMsg });
    }
  }

  if (opts.json) {
    console.log(JSON.stringify({ 
      success: results.every(r => r.success), 
      results 
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
