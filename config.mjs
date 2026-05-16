// config.mjs
import { config } from 'dotenv';
import { privateKeyToAccount } from 'viem/accounts';
import { isAddress, getAddress, zeroAddress } from 'viem';
import pc from 'picocolors';

config({ path: '.env' });

const SOURCE_PK = process.env.SOURCE_PRIVATE_KEY?.trim();
const VICTIM_PK = process.env.VICTIM_PRIVATE_KEY?.trim();
const SPONSOR_PK = process.env.SPONSOR_PRIVATE_KEY?.trim();
let DELEGATE_TO = process.env.DELEGATE_TO?.trim() || null;

const privateKey = SOURCE_PK || VICTIM_PK;

if (!privateKey) {
  console.error(pc.red("❌ SOURCE_PRIVATE_KEY (or VICTIM_PRIVATE_KEY) is required in .env"));
  process.exit(1);
}
if (!SPONSOR_PK) {
  console.error(pc.red("❌ SPONSOR_PRIVATE_KEY is required in .env"));
  process.exit(1);
}

if (VICTIM_PK && !SOURCE_PK) {
  console.warn(pc.yellow("⚠️  VICTIM_PRIVATE_KEY is deprecated. Please use SOURCE_PRIVATE_KEY instead."));
}

export const sourceAccount = privateKeyToAccount(privateKey);
export const sponsorAccount = privateKeyToAccount(SPONSOR_PK);
export { DELEGATE_TO };

export const MIN_SPONSOR_BALANCE = parseFloat(process.env.SPONSOR_MIN_BALANCE) || 0.003;

// Улучшенная валидация DELEGATE_TO
if (DELEGATE_TO) {
  if (DELEGATE_TO === "0x..." || DELEGATE_TO === "0x000...") {
    DELEGATE_TO = zeroAddress;
  }

  if (!isAddress(DELEGATE_TO)) {
    console.error(pc.red("❌ DELEGATE_TO is not a valid Ethereum address"));
    process.exit(1);
  }

  DELEGATE_TO = getAddress(DELEGATE_TO);

  if (DELEGATE_TO === zeroAddress) {
    console.log(pc.gray("   ℹ️  Revoke mode (zero address)"));
  } else if (DELEGATE_TO.toLowerCase() === sourceAccount.address.toLowerCase()) {
    console.error(pc.red("❌ DELEGATE_TO cannot be the same as source account"));
    process.exit(1);
  } else {
    console.log(pc.cyan(`   Delegate target: ${DELEGATE_TO}`));
  }
} else {
  console.log(pc.gray("   ℹ️  Revoke mode (no DELEGATE_TO set)"));
}

console.log(pc.green("✅ Configuration loaded successfully"));
console.log(`   Source:   ${sourceAccount.address}`);
console.log(`   Sponsor:  ${sponsorAccount.address}`);
