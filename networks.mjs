// networks.mjs
import { 
  mainnet, 
  base, 
  arbitrum, 
  optimism, 
  polygon, 
  bsc, 
  gnosis, 
  linea, 
  blast, 
  mantle 
} from 'viem/chains';

export const networksMap = {
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  bsc,
  gnosis,
  linea,
  blast,
  mantle
};

// Удобные алиасы для пользователей
export const networkAliases = {
  ethereum: 'mainnet',
  eth: 'mainnet',
  bnb: 'bsc',
  'bnb chain': 'bsc',
  binance: 'bsc',
  'binance smart chain': 'bsc',
  matic: 'polygon',
  arb: 'arbitrum',
  'arbitrum one': 'arbitrum',
  opt: 'optimism',
  gnosis: 'gnosis',
  linea: 'linea',
  blast: 'blast',
  mantle: 'mantle',
};

// Функция для получения сети по имени/алиасу
export function getNetwork(name) {
  if (!name) return mainnet;

  const lower = name.toLowerCase().trim();
  
  // Прямое совпадение
  if (networksMap[lower]) return networksMap[lower];
  
  // По алиасу
  const alias = networkAliases[lower];
  if (alias && networksMap[alias]) return networksMap[alias];

  console.warn(`⚠️ Неизвестная сеть: ${name}. Используется mainnet.`);
  return mainnet;
}
