// eip7702-utils.mjs
import { createPublicClient, createWalletClient, http, zeroAddress, parseEther } from 'viem';
import pc from 'picocolors';

const MIN_BALANCE_PER_CHAIN = {
  1:    0.008,   // Ethereum
  10:   0.003,   // Optimism
  42161: 0.003,  // Arbitrum
  8453:  0.003,  // Base
  137:   0.004,  // Polygon
  56:    0.002,  // BNB Chain
  100:   0.005,  // Gnosis
  59144: 0.003,  // Linea
};

function getMinBalanceForChain(chainId) {
  return MIN_BALANCE_PER_CHAIN[chainId] || 0.003;
}

export async function checkCurrentDelegation(publicClient, address) {
  try {
    const code = await publicClient.getCode({ address });
    return { 
      delegated: code && code !== '0x' && code !== '0x0',
      hasCode: code && code !== '0x' && code !== '0x0'
    };
  } catch {
    return { delegated: false, hasCode: false };
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
  const walletClient = createWalletClient({ 
    account: sponsorAccount, 
    chain: network, 
    transport 
  });

  console.log(pc.cyan(`\n→ ${network.name} (Chain ID: ${network.id})`));

  // ====================== 1. Проверка делегации ПЕРЕД подписью ======================
  const delegation = await checkCurrentDelegation(publicClient, sourceAccount.address);

  if (!delegation.delegated && contractAddress === zeroAddress) {
    console.log(pc.yellow("   ⚠️  No active delegation detected. Nothing to revoke."));
    console.log(pc.gray("   Skipping this network to save gas and signature.\n"));
    return true; // считаем успешным, чтобы не ломать цикл
  }

  if (delegation.delegated) {
    console.log(pc.yellow("   ⚠️  Active delegation detected"));
  } else {
    console.log(pc.green("   ✓ No active delegation"));
  }

  // ====================== 2. Nonce ======================
  const nonce = manualNonce !== null 
    ? Number(manualNonce)
    : await publicClient.getTransactionCount({ 
        address: sourceAccount.address, 
        blockTag: 'pending' 
      });

  if (manualNonce !== null) {
    console.log(pc.yellow(`   ⚠️  Using MANUAL nonce: ${nonce} (use with caution)`));
  } else {
    console.log(pc.gray(`   Nonce: ${nonce}`));
  }

  // ====================== 3. Подпись авторизации ======================
  const authorization = await sourceAccount.signAuthorization({
    contractAddress,
    chainId: network.id,
    nonce,
  });

  console.log(pc.green("   ✅ Authorization signed"));

  // ====================== 4. Dry-run ======================
  if (dryRun) {
    console.log(pc.yellow("\n   🧪 DRY-RUN MODE — Detailed preview:"));
    console.log(pc.gray(`   • Target:     ${sourceAccount.address}`));
    console.log(pc.gray(`   • Delegate:   ${contractAddress}`));
    console.log(pc.gray(`   • Chain:      ${network.id} (${network.name})`));
    console.log(pc.gray(`   • Nonce:      ${nonce}`));
    console.log(pc.yellow("   Transaction will NOT be sent.\n"));
    return true;
  }

  // ====================== 5. Динамическая проверка баланса спонсора ======================
  const sponsorBalance = await publicClient.getBalance({ address: sponsorAccount.address });
  const balanceEth = Number(sponsorBalance) / 1e18;
  const minRecommended = getMinBalanceForChain(network.id);

  console.log(`   Sponsor balance: ${balanceEth.toFixed(4)} ${network.nativeCurrency.symbol}`);

  if (balanceEth < minRecommended * 0.7) { // жёсткий порог
    console.log(pc.red(`   ❌ Insufficient sponsor balance (need ~${minRecommended})`));
    return false;
  }

  // ====================== 6. Отправка транзакции ======================
  let gas = 120000n;
  try {
    gas = await publicClient.estimateGas({
      account: sponsorAccount,
      to: sourceAccount.address,
      authorizationList: [authorization],
    });
  } catch (e) {
    console.warn(pc.yellow("   ⚠️  Gas estimation failed, using default"));
  }

  const hash = await walletClient.sendTransaction({
    to: sourceAccount.address,
    authorizationList: [authorization],
    gas: (gas * 135n) / 100n,
  });

  console.log(pc.blue(`   📤 Transaction: ${hash}`));
  console.log(`   🔗 ${network.blockExplorers?.default?.url}/tx/${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ 
    hash, 
    confirmations: 1, 
    timeout: 90000 
  });

  const success = receipt.status === 'success';
  console.log(success ? pc.green("   ✅ SUCCESS") : pc.red("   ❌ FAILED"));
  
  return success;
}
