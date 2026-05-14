// config.mjs
import { config } from 'dotenv';
import { privateKeyToAccount } from 'viem/accounts';
import { 
    base, mainnet, bsc, arbitrum, optimism, polygon, 
    gnosis, linea, blast, mode, soneium, zksync 
} from 'viem/chains';

config({ path: '.env' });

if (!process.env.VICTIM_PRIVATE_KEY || !process.env.SPONSOR_PRIVATE_KEY) {
    console.error("❌ Error: Please fill VICTIM_PRIVATE_KEY and SPONSOR_PRIVATE_KEY in .env file");
    process.exit(1);
}

export const VICTIM_PK = process.env.VICTIM_PRIVATE_KEY;
export const SPONSOR_PK = process.env.SPONSOR_PRIVATE_KEY;
export const DELEGATE_TO = process.env.DELEGATE_TO;

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