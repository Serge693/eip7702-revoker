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
  console.error(pc.red("❌ SOURCE_PRIVATE_KEY (or VICTIM_PRIVATE_KEY) is required"));
  process.exit(1);
}
if (!SPONSOR_PK) {
  console.error(pc.red("❌ SPONSOR_PRIVATE_KEY is required"));
  process.exit(1);
}

// === Валидация приватного ключа ===
function validatePrivateKey(pk, name) {
  if (!pk.startsWith('0x')) {
    console.error(pc.red(`❌ ${name} must start with 0x`));
    process.exit(1);
  }
  if (pk.length !== 66) {
    console.error(pc.red(`❌ ${name} must be 66 characters long (0x + 64 hex chars)`));
    process.exit(1);
  }
  if (!/^[0-9a-fA-F]+$/.test(pk.slice(2))) {
    console.error(pc.red(`❌ ${name} contains invalid hexadecimal characters`));
    process.exit(1);
  }
}

validatePrivateKey(privateKey, "SOURCE_PRIVATE_KEY");
validatePrivateKey(SPONSOR_PK, "SPONSOR_PRIVATE_KEY");

if (VICTIM_PK && !SOURCE_PK) {
  console.warn(pc.yellow("⚠️  VICTIM_PRIVATE_KEY is deprecated. Use SOURCE_PRIVATE_KEY instead."));
}

export const sourceAccount = privateKeyToAccount(privateKey);
export const sponsorAccount = privateKeyToAccount(SPONSOR_PK);
export { DELEGATE_TO };

export const MIN_SPONSOR_BALANCE = parseFloat(process.env.SPONSOR_MIN_BALANCE) || 0.003;

if (DELEGATE_TO) {
  if (!isAddress(DELEGATE_TO)) {
    console.error(pc.red("❌ DELEGATE_TO is not a valid address"));
    process.exit(1);
  }
  DELEGATE_TO = getAddress(DELEGATE_TO);
}

console.log(pc.green("✅ Configuration loaded successfully"));
console.log(`   Source:   ${sourceAccount.address}`);
console.log(`   Sponsor:  ${sponsorAccount.address}`);
if (DELEGATE_TO) console.log(`   Delegate: ${DELEGATE_TO}`);
