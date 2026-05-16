// config.mjs
import { config } from 'dotenv';
import { privateKeyToAccount } from 'viem/accounts';
import pc from 'picocolors';

config({ path: '.env' });

const VICTIM_PK = process.env.VICTIM_PRIVATE_KEY?.trim();
const SPONSOR_PK = process.env.SPONSOR_PRIVATE_KEY?.trim();
const DELEGATE_TO = process.env.DELEGATE_TO?.trim() || null;

if (!VICTIM_PK) {
  console.error(pc.red("❌ VICTIM_PRIVATE_KEY is required in .env"));
  process.exit(1);
}
if (!SPONSOR_PK) {
  console.error(pc.red("❌ SPONSOR_PRIVATE_KEY is required in .env"));
  process.exit(1);
}

if (VICTIM_PK.toLowerCase() === SPONSOR_PK.toLowerCase()) {
  console.warn(pc.yellow("⚠️  Warning: VICTIM and SPONSOR private keys are the same"));
}

export const victimAccount = privateKeyToAccount(VICTIM_PK);
export const sponsorAccount = privateKeyToAccount(SPONSOR_PK);
export { DELEGATE_TO };

export const MIN_SPONSOR_BALANCE = 0.003; // ETH

console.log(pc.green("✅ Configuration loaded successfully"));
console.log(`   Victim:  ${victimAccount.address}`);
console.log(`   Sponsor: ${sponsorAccount.address}`);
if (DELEGATE_TO) console.log(`   Delegate target: ${DELEGATE_TO}`);
