// eip7702-utils.mjs
import { createPublicClient, createWalletClient, http, zeroAddress, parseEther } from 'viem';
import pc from 'picocolors';

export async function sendEIP7702Tx({
  network,
  sourceAccount,
  sponsorAccount,
  contractAddress = zeroAddress,
  dryRun = false,
  customRpc = null,
  manualNonce = null,
  jsonOutput = false
}) {
  const transport = customRpc ? http(customRpc) : http(network.rpcUrls.default.http[0]);
  const publicClient = createPublicClient({ chain: network, transport });
  const walletClient = createWalletClient({ 
    account: sponsorAccount, 
    chain: network, 
    transport 
  });

  if (!jsonOutput) console.log(pc.cyan(`\n→ ${network.name} (Chain ID: ${network.id})`));

  // 1. Проверка текущей делегации
  const code = await publicClient.getCode({ address: sourceAccount.address });
  const hasDelegation = code && code !== '0x' && code !== '0x0';

  if (!hasDelegation && contractAddress === zeroAddress) {
    if (!jsonOutput) console.log(pc.yellow("   ⚠️  No active delegation. Nothing to revoke."));
    return true;
  }

  if (!jsonOutput) {
    console.log(hasDelegation 
      ? pc.yellow("   ⚠️  Active delegation detected") 
      : pc.green("   ✓ No active delegation"));
  }

  // 2. Nonce
  const nonce = manualNonce !== null 
    ? Number(manualNonce)
    : await publicClient.getTransactionCount({ 
        address: sourceAccount.address, 
        blockTag: 'pending' 
      });

  // 3. Подпись авторизации
  const authorization = await sourceAccount.signAuthorization({
    contractAddress,
    chainId: network.id,
    nonce,
  });

  if (!jsonOutput) console.log(pc.green("   ✅ Authorization signed"));

  if (dryRun) {
    if (!jsonOutput) console.log(pc.yellow("   🧪 DRY-RUN MODE — transaction not sent"));
    return true;
  }

  // ==================== ДИНАМИЧЕСКАЯ ПРОВЕРКА БАЛАНСА ====================
  const sponsorBalance = await publicClient.getBalance({ address: sponsorAccount.address });
  const balanceEth = Number(sponsorBalance) / 1e18;

  if (!jsonOutput) {
    console.log(`   Sponsor balance: ${balanceEth.toFixed(5)} ${network.nativeCurrency.symbol}`);
  }

  // Оцениваем стоимость транзакции
  let estimatedGas = 120000n;
  try {
    estimatedGas = await publicClient.estimateGas({
      account: sponsorAccount,
      to: sourceAccount.address,
      authorizationList: [authorization],
    });
  } catch (e) {
    if (!jsonOutput) console.warn(pc.yellow("   ⚠️  Could not estimate gas, using default"));
  }

  // Получаем актуальную цену газа
  let gasCostEth = 0;
  try {
    const fees = await publicClient.estimateFeesPerGas();
    const gasPrice = fees.maxFeePerGas || fees.gasPrice || 1000000000n; // fallback 1 gwei
    gasCostEth = Number(estimatedGas * gasPrice) / 1e18;
  } catch {
    // Fallback calculation
    gasCostEth = Number(estimatedGas) * 0.00000005; // очень грубая оценка
  }

  const recommendedBalance = gasCostEth * 1.5; // 50% запас

  if (!jsonOutput) {
    console.log(pc.gray(`   Estimated gas cost: ~${gasCostEth.toFixed(6)} ${network.nativeCurrency.symbol}`));
    console.log(pc.gray(`   Recommended balance: ~${recommendedBalance.toFixed(5)}`));
  }

  // Финальная проверка
  if (balanceEth < recommendedBalance * 0.7) {
    if (!jsonOutput) console.log(pc.red(`   ❌ Insufficient balance for safe execution`));
    return false;
  }

  if (balanceEth < recommendedBalance) {
    if (!jsonOutput) console.log(pc.yellow(`   ⚠️  Balance is low, but trying anyway...`));
  }

  // ==================== Отправка транзакции ====================
  try {
    const hash = await walletClient.sendTransaction({
      to: sourceAccount.address,
      authorizationList: [authorization],
      gas: (estimatedGas * 135n) / 100n,   // +35% margin
    });

    if (!jsonOutput) {
      console.log(pc.blue(`   📤 Transaction: ${hash}`));
      console.log(`   🔗 ${network.blockExplorers?.default?.url}/tx/${hash}`);
    }

    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash, 
      confirmations: 1, 
      timeout: 90000 
    });

    const success = receipt.status === 'success';
    if (!jsonOutput) console.log(success ? pc.green("   ✅ SUCCESS") : pc.red("   ❌ FAILED"));

    return success;

  } catch (err) {
    if (!jsonOutput) console.error(pc.red("   ❌ Error:"), err.message);
    return false;
  }
}
