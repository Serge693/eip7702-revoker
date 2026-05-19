// networks.mjs
import { defineChain } from 'viem';

export const networks = {
  ethereum: defineChain({
    id: 1,
    name: 'Ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://eth.llamarpc.com'] } },
    blockExplorers: { default: { url: 'https://etherscan.io' } },
  }),

  base: defineChain({
    id: 8453,
    name: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://mainnet.base.org'] } },
    blockExplorers: { default: { url: 'https://basescan.org' } },
  }),

  arbitrum: defineChain({
    id: 42161,
    name: 'Arbitrum One',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://arb1.arbitrum.io/rpc'] } },
    blockExplorers: { default: { url: 'https://arbiscan.io' } },
  }),

  optimism: defineChain({
    id: 10,
    name: 'OP Mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://mainnet.optimism.io'] } },
    blockExplorers: { default: { url: 'https://optimistic.etherscan.io' } },
  }),

  polygon: defineChain({
    id: 137,
    name: 'Polygon',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrls: { default: { http: ['https://polygon-rpc.com'] } },
    blockExplorers: { default: { url: 'https://polygonscan.com' } },
  }),

  bsc: defineChain({
    id: 56,
    name: 'BNB Smart Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: { default: { http: ['https://bsc-dataseed.bnbchain.org'] } },
    blockExplorers: { default: { url: 'https://bscscan.com' } },
  }),

  gnosis: defineChain({
    id: 100,
    name: 'Gnosis Chain',
    nativeCurrency: { name: 'xDAI', symbol: 'xDAI', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.gnosischain.com'] } },
    blockExplorers: { default: { url: 'https://gnosisscan.io' } },
  }),

  linea: defineChain({
    id: 59144,
    name: 'Linea',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.linea.build'] } },
    blockExplorers: { default: { url: 'https://lineascan.build' } },
  }),

  blast: defineChain({
    id: 81457,
    name: 'Blast',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.blast.io'] } },
    blockExplorers: { default: { url: 'https://blastscan.io' } },
  }),

  mode: defineChain({
    id: 34443,
    name: 'Mode',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://mode.drpc.org'] } },
    blockExplorers: { default: { url: 'https://modescan.io' } },
  }),

  soneium: defineChain({
    id: 1868,
    name: 'Soneium',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.soneium.org'] } },
    blockExplorers: { default: { url: 'https://soneium.blockscout.com' } },
  }),

  zksync: defineChain({
    id: 324,
    name: 'zkSync Era',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://mainnet.era.zksync.io'] } },
    blockExplorers: { default: { url: 'https://era.zksync.network' } },
  }),
};

// Алиасы для удобства
const aliases = {
  eth: 'ethereum',
  mainnet: 'ethereum',
  arb: 'arbitrum',
  op: 'optimism',
  bnb: 'bsc',
  polygon: 'polygon',
  matic: 'polygon',
};

export function getNetworkByName(name) {
  const key = name.toLowerCase().trim();
  return networks[key] || networks[aliases[key]] || null;
}

export function getNetworks() {
  return Object.values(networks);
}

export function getAllNetworkKeys() {
  return Object.keys(networks);
}
