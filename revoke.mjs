// revoke.mjs
import { Command } from 'commander';
import * as cfg from './config.mjs';
import { sendEIP7702Tx } from './eip7702-utils.mjs';
import { zeroAddress } from 'viem';
import { networksMap, networkAliases } from './networks.mjs';
import pc from 'picocolors';

const program = new Command();

program
  .name('revoke')
  .description('Revoke EIP-7702 authorization (reset to zero address)')
  .option('-n, --network <networks>', 'Networks (comma separated) or "all"', 'base')
  .option('--dry-run', 'Simulate only, do not send transaction')
  .option('--rpc <url>', 'Custom RPC URL')
  .option('--nonce <number>', 'Manual nonce')
  .option('-y, --yes', 'Skip confirmation')
  .option('--json', 'Output result as JSON')
  .parse();

const opts = program.opts();

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
      const net = networksMap[normalized];
      if (!net && !opts.json) console.warn(pc.yellow(`Unknown network: ${name}`));
      return net;
    }).filter(Boolean);
  }

  if (selectedNetworks.length === 0) {
    if (opts.json) {
      console.log(JSON.stringify({ success: false, error: "no_valid_networks" }));
    } else {
      console.error(pc.red("No valid networks selected"));
    }
    process.exit(1);
  }

  if (!opts.json) {
    console.log(pc.cyan(`Target networks: ${selectedNetworks.map(n => n.name).join(', ')}`));
  }

  const results = [];

  for (const network of selectedNetworks) {
    try {
      const success = await sendEIP7702Tx({
        network,
        sourceAccount: cfg.sourceAccount,
        sponsorAccount: cfg.sponsorAccount,
        contractAddress: zeroAddress,
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
