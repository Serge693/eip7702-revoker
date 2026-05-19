#!/usr/bin/env node
import { config } from 'dotenv';
import { privateKeyToAccount } from 'viem/accounts';
import pc from 'picocolors';
import * as utils from './eip7702-utils.mjs';
import { getNetworks, getNetworkByName } from './networks.mjs';
import { createInterface } from 'readline';

config();

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (question) => new Promise(resolve => rl.question(question, resolve));

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  // Support --network=base format too
  const eqIndex = process.argv.findIndex(arg => arg.startsWith(flag + '='));
  if (eqIndex !== -1) {
    return process.argv[eqIndex].split('=')[1];
  }
  return null;
}

async function main() {
  console.log(pc.bold(pc.cyan("\n🔥 EIP-7702 Revoker\n")));

  const networkArg = getArgValue('--network') || 'ethereum';
  const dryRun = process.argv.includes('--dry-run');
  const victimPk = process.env.SOURCE_PRIVATE_KEY || process.env.VICTIM_PRIVATE_KEY;
  const sponsorPk = process.env.SPONSOR_PRIVATE_KEY;

  if (!victimPk || !sponsorPk) {
    console.error(pc.red("❌ SOURCE_PRIVATE_KEY and SPONSOR_PRIVATE_KEY must be set in .env"));
    rl.close();
    process.exit(1);
  }

  const victimAccount = privateKeyToAccount(victimPk);
  const sponsorAccount = privateKeyToAccount(sponsorPk);

  console.log(pc.gray(`Victim:  ${victimAccount.address}`));
  console.log(pc.gray(`Sponsor: ${sponsorAccount.address}`));

  let networksList = [];

  if (networkArg.toLowerCase() === 'all') {
    networksList = getNetworks();
    console.log(pc.yellow(`\n⚠️  Revoking on ALL networks (${networksList.length})`));
  } else {
    const names = networkArg.split(',').map(n => n.trim().toLowerCase());
    networksList = names.map(name => getNetworkByName(name)).filter(Boolean);
  }

  // Дедупликация
  const uniqueNetworks = networksList.filter((net, index, self) =>
    index === self.findIndex(n => n.id === net.id)
  );

  if (uniqueNetworks.length === 0) {
    console.error(pc.red(`❌ Unknown network: ${networkArg}`));
    console.log(pc.gray("Available: ethereum, base, arbitrum, optimism, polygon, bsc, etc."));
    rl.close();
    return;
  }

  console.log(pc.cyan(`\nNetworks: ${uniqueNetworks.map(n => n.name).join(', ')}\n`));

  const confirm = dryRun ? 'y' : await ask(pc.yellow("Continue? (y/N): "));
  if (!dryRun && !['y', 'yes'].includes(confirm.toLowerCase())) {
    console.log(pc.gray("Cancelled."));
    rl.close();
    return;
  }

  let successCount = 0;

  for (const network of uniqueNetworks) {
    try {
      console.log(pc.cyan(`\n→ Processing ${network.name} (Chain ID: ${network.id})`));
      
      const success = await utils.sendEIP7702Tx({
        network,
        sourceAccount: victimAccount,
        sponsorAccount,
        contractAddress: utils.zeroAddress, // revoke
        dryRun,
        jsonOutput: false
      });

      if (success) successCount++;
    } catch (err) {
      console.error(pc.red(`   ❌ Error on ${network.name}:`), err.message);
    }
  }

  console.log(pc.bold(pc.cyan(`\n✅ Finished. Successful: ${successCount}/${uniqueNetworks.length}`)));
}

main().catch(console.error).finally(() => rl.close());
