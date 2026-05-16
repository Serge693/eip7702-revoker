// networks.mjs
import { mainnet, base, arbitrum, optimism, polygon, bsc, gnosis, linea, blast } from 'viem/chains';

export const networksMap = {
  mainnet, base, arbitrum, optimism, polygon, bsc, gnosis, linea, blast
};

export const networkAliases = {
  ethereum: 'mainnet',
  bnb: 'bsc',
  'bnb chain': 'bsc',
  'binance': 'bsc',
  'binance smart chain': 'bsc',
  'arbitrum one': 'arbitrum',
  eth: 'mainnet',
  polygon: 'polygon',
  matic: 'polygon'
};