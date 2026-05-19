// delegate.mjs
import { Command } from 'commander';
import * as cfg from './config.mjs';
import { sendEIP7702Tx } from './eip7702-utils.mjs';
import { networksMap, networkAliases } from './networks.mjs';
import { createPublicClient, http } from 'viem';
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
  .option('--force', 'Force delegation even to EOA')
  .option('--json', 'Output result as JSON')
  .parse();

const opts = program.opts();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function confirmAction(networkNames, delegateTo) {
  if (opts.yes || opts.dryRun || opts.json) return true;

  console.log(pc.yellow('\n⚠️  You are about to DELEGATE to:'));
  console.log(pc.cyan(`   ${delegateTo}`));
  console.log(pc.yellow(`\nOn ${networkNames.length} network(s):`));
  console.log(pc.cyan(networkNames.join(', ')));

  const answer = await rl.question('\nType "yes" to continue: ');
  rl.close();
  return answer.toLowerCase() === 'yes';
}

async function isContract(publicClient, address) {
  try {
    const code = await publicClient.getCode({ address });
    return code && code !== '0x' && code !== '0x0';
  } catch {
    return false;
  }
}

async function main() {
  if (!opts.json) {
    console.log(pc.bold(pc.magenta("\n🔄 EIP-7702 Delegator v1.4.0\n")));
  }

  if (!cfg.DELEGATE_TO) {
    if (opts.json) console.log(JSON.stringify({ success: false, error: "DELEGATE_TO_not_set" }));
    else console.error(pc.red("❌ DELEGATE_TO is not set in .env"));
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

  // === Защита от делегации на EOA ===
  if (!opts.force && !opts.dryRun && !opts.json) {
    console.log(pc.cyan(`\nChecking if ${cfg.DELEGATE_TO} is a contract...`));

    const testClient = createPublicClient({
      chain: selectedNetworks[0],
      transport: http(),
    });

    const isContractCheck = await isContract(testClient, cfg.DELEGATE_TO);

    if (!isContractCheck) {
      console.log(pc.red("\n⚠️  WARNING: Target address appears to be an EOA!"));
      console.log(pc.red("   Delegating to EOA is dangerous."));

      const forceAnswer = await rl.question('Do you want to continue anyway? (type "force"): ');
      if (forceAnswer.toLowerCase() !== 'force') {
        console.log(pc.yellow("Operation cancelled."));
        process.exit(0);
      }
    } else {
      console.log(pc.green("   ✓ Target is a smart contract"));
    }
  }

  if (!await confirmAction(networkNames, cfg.DELEGATE_TO)) {
    console.log(pc.yellow("Operation cancelled by user."));
    process.exit(0);
  }

  if (!opts.json) {
    console.log(pc.cyan(`\nStarting delegation on ${networkNames.join(', ')}`));
  }

  const tasks = selectedNetworks.map(network =>
    sendEIP7702Tx({
      network,
      sourceAccount: cfg.sourceAccount,
      sponsorAccount: cfg.sponsorAccount,
      contractAddress: cfg.DELEGATE_TO,
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
