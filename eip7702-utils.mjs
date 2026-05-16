// eip7702-utils.mjs
import { createPublicClient, createWalletClient, http, zeroAddress, parseEther } from 'viem';
import pc from 'picocolors';

const MIN_BALANCE_PER_CHAIN = {
  1:    0.012,   // Ethereum Mainnet — выше
  10:   0.004,   // Optimism
  42161: 0.004,  // Arbitrum
  8453:  0.003,  // Base
  137:   0.005,  // Polygon
  56:    0.003,  // BNB Chain
  100:   0.006,  // Gnosis
  59144: 0.004,  // Linea
  81457: 0.003,  // Blast
};

function getMinBalanceForChain(chainId) {
  return MIN_BALANCE_PER_CHAIN[chainId] || 0.003;
}

export async function checkCurrentDelegation(publicClient, address) {
  try {
    const code = await publicClient.getCode({ address });
    return { delegated: code && code !== '0x' && code !== '0x0' };
  } catch {
    return { delegated: false };
  }
}

export async function sendEIP7702Tx({
  network,
  sourceAccount,
  sponsorAccount,
  contractAddress = zeroAddress,
  dryRun = false,
  customRpc = null,
  manualNonce = null
}) {
  const transport = customRpc ? http(customRpc) : http(network.rpcUrls.default.http[0]);

  const publicClient = createPublicClient({ chain: network, transport });
  const walletClient = createWalletClient({ account: sponsorAccount, chain: network, transport });

  console.log(pc.cyan(`\n→ ${network.name} (Chain ID: ${network.id})`));

  // === Динамическая проверка баланса спонсора ===
  const sponsorBalance = await publicClient.getBalance({ address: sponsorAccount.address });
  const balance = Number(sponsorBalance) / 1e18;
  const minBalance = getMinBalanceForChain(network.id);

  console.log(`   Sponsor balance: ${balance.toFixed(4)} ${network.nativeCurrency.symbol}`);
  console.log(pc.gray(`   Minimum recommended: ${minBalance} ${network.nativeCurrency.symbol}`));

  if (balance < minBalance) {
    console.log(pc.red(`   ❌ Insufficient sponsor balance. Need at least ${minBalance}`));
    return false;
  }

  // Получаем pending nonce
  const nonce = manualNonce !== null 
    ? Number(manualNonce)
    : await publicClient.getTransactionCount({ 
        address: sourceAccount.address, 
        blockTag: 'pending' 
      });

  if (manualNonce !== null) {
    console.log(pc.yellow(`   ⚠️  Using manual nonce: ${nonce}`));
  } else {
    console.log(pc.gray(`   Nonce: ${nonce}`));
  }

  const authorization = await sourceAccount.signAuthorization({
    contractAddress,
    chainId: network.id,
    nonce,
  });

  console.log(pc.green("   ✅ Authorization signed"));

  // === Dry-run с подробной информацией ===
  if (dryRun) {
    console.log(pc.yellow("\n   🧪 DRY-RUN MODE"));
    console.log(pc.gray(`   Target:     ${sourceAccount.address}`));
    console.log(pc.gray(`   Delegate:   ${contractAddress}`));
    console.log(pc.gray(`   Chain ID:   ${network.id}`));
    console.log(pc.gray(`   Nonce:      ${nonce}`));
    console.log(pc.gray(`   Auth hash:  ${authorization.authorizationHash?.slice(0, 20)}...`));
    console.log(pc.yellow("   Transaction will NOT be sent.\n"));
    return true;
  }

  // === Улучшенная оценка газа ===
  let gas = 120000n;
  try {
    gas = await publicClient.estimateGas({
      account: sponsorAccount,
      to: sourceAccount.address,
      authorizationList: [authorization],
    });
    console.log(pc.gray(`   Gas estimated: ${gas}`));
  } catch (e) {
    console.warn(pc.yellow("   ⚠️  Gas estimation failed, using safe default 120000"));
  }

  const hash = await walletClient.sendTransaction({
    to: sourceAccount.address,
    authorizationList: [authorization],
    gas: (gas * 135n) / 100n,        // +35% margin
  });

  console.log(pc.blue(`   📤 Transaction: ${hash}`));
  console.log(`   🔗 Explorer: ${network.blockExplorers?.default?.url}/tx/${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ 
    hash, 
    confirmations: 1, 
    timeout: 90000 
  });

  const success = receipt.status === 'success';
  console.log(success ? pc.green("   ✅ SUCCESS") : pc.red("   ❌ FAILED"));
  
  return success;
}
