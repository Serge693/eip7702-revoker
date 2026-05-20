// config.mjs

import { config } from 'dotenv';
import { privateKeyToAccount } from 'viem/accounts';
import { isAddress, getAddress } from 'viem';
import pc from 'picocolors';
import { createRequire } from 'module';

config({ path: '.env' });

// Версия читается из package.json — не нужно обновлять вручную
const { version } = createRequire(import.meta.url)('./package.json');
export { version };

const SOURCE_PK = process.env.SOURCE_PRIVATE_KEY?.trim();
const VICTIM_PK = process.env.VICTIM_PRIVATE_KEY?.trim();   // deprecated
const SPONSOR_PK = process.env.SPONSOR_PRIVATE_KEY?.trim();
let DELEGATE_TO = process.env.DELEGATE_TO?.trim() || null;

const privateKey = SOURCE_PK || VICTIM_PK;

if (!privateKey) {
  console.error(pc.red('❌  SOURCE_PRIVATE_KEY (or VICTIM_PRIVATE_KEY) is required in .env'));
  process.exit(1);
}

if (!SPONSOR_PK) {
  console.error(pc.red('❌  SPONSOR_PRIVATE_KEY is required in .env'));
  process.exit(1);
}

// Валидация формата приватного ключа
function validatePrivateKey(pk, name) {
  if (!pk.startsWith('0x')) {
    console.error(pc.red(`❌  ${name} must start with 0x`));
    process.exit(1);
  }
  if (pk.length !== 66) {
    console.error(pc.red(`❌  ${name} must be 66 chars (0x + 64 hex). Got ${pk.length}.`));
    process.exit(1);
  }
  if (!/^[0-9a-fA-F]+$/.test(pk.slice(2))) {
    console.error(pc.red(`❌  ${name} contains invalid hex characters`));
    process.exit(1);
  }
}

validatePrivateKey(privateKey, 'SOURCE_PRIVATE_KEY');
validatePrivateKey(SPONSOR_PK, 'SPONSOR_PRIVATE_KEY');

if (VICTIM_PK && !SOURCE_PK) {
  console.warn(pc.yellow('⚠️   VICTIM_PRIVATE_KEY is deprecated. Rename to SOURCE_PRIVATE_KEY in .env'));
}

export const sourceAccount  = privateKeyToAccount(privateKey);
export const sponsorAccount = privateKeyToAccount(SPONSOR_PK);

// Минимальный баланс спонсора (информационно, не блокирует запуск)
export const MIN_SPONSOR_BALANCE = parseFloat(process.env.SPONSOR_MIN_BALANCE) || 0.003;

// Валидация DELEGATE_TO если задан
if (DELEGATE_TO) {
  if (!isAddress(DELEGATE_TO)) {
    console.error(pc.red(`❌  DELEGATE_TO is not a valid Ethereum address: ${DELEGATE_TO}`));
    process.exit(1);
  }
  DELEGATE_TO = getAddress(DELEGATE_TO); // checksummed
}
export { DELEGATE_TO };

// ИСПРАВЛЕНО: вывод конфига только если не JSON-режим и не тихий режим.
// Раньше этот console.log срабатывал всегда при import config.mjs,
// что ломало --json output (добавлял мусор перед JSON).
const silent = process.argv.includes('--json') || process.env.SILENT === '1';
if (!silent) {
  console.log(pc.green(`✅  Config loaded (v${version})`));
  console.log(`    Source:  ${sourceAccount.address}`);
  console.log(`    Sponsor: ${sponsorAccount.address}`);
  if (DELEGATE_TO) console.log(`    Delegate to: ${DELEGATE_TO}`);
}
