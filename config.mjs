// config.mjs
import { config } from 'dotenv';
import { privateKeyToAccount } from 'viem/accounts';
import { 
    base, mainnet, bsc, arbitrum, optimism, polygon, 
    gnosis, linea, blast, mode, soneium, zksync 
} from 'viem/chains';

config({ path: '.env' });

// Проверка наличия обязательных переменных
if (!process.env.VICTIM_PRIVATE_KEY) {
    console.error("❌ Error: VICTIM_PRIVATE_KEY is not set in .env file");
    process.exit(1);
}

if (!process.env.SPONSOR_PRIVATE_KEY) {
    console.error("❌ Error: SPONSOR_PRIVATE_KEY is not set in .env file");
    process.exit(1);
}

// Безопасная проверка формата приватных ключей
const victimPk = process.env.VICTIM_PRIVATE_KEY.trim();
const sponsorPk = process.env.SPONSOR_PRIVATE_KEY.trim();

if (!victimPk.startsWith('0x') || !sponsorPk.startsWith('0x')) {
    console.error("❌ Error: Private keys must start with '0x'");
    process.exit(1);
}

if (victimPk.length !== 66 || sponsorPk.length !== 66) {
    console.warn("⚠️  Warning: Private key length looks incorrect (should be 66 characters including 0x)");
}

export const VICTIM_PK = victimPk;
export const SPONSOR_PK = sponsorPk;
export const DELEGATE_TO = process.env.DELEGATE_TO?.trim() || null;

export const NETWORKS = {
    base, mainnet, bsc, arbitrum, optimism, polygon,
    gnosis, linea, blast, mode, soneium, zksync
};

export function getNetwork(name) {
    const network = NETWORKS[name.toLowerCase()];
    if (!network) throw new Error(`Unknown network: ${name}`);
    return network;
}

export function getNetworks(names) {
    if (!names || names.toLowerCase() === 'all') {
        return Object.values(NETWORKS);
    }
    return names.split(',').map(n => getNetwork(n.trim()));
}

export const victimAccount = privateKeyToAccount(VICTIM_PK);
export const sponsorAccount = privateKeyToAccount(SPONSOR_PK);

console.log("✅ Configuration loaded successfully from .env");
