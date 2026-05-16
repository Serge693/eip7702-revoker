// eip7702-utils.mjs
import { createPublicClient, createWalletClient, http, zeroAddress, parseEther } from 'viem';
import pc from 'picocolors';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

  // 1. Проверка делегации
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

  // 3. Подпись
  const authorization = await sourceAccount.signAuthorization({
    contractAddress,
    chainId: network.id,
    nonce,
  });

  if (!jsonOutput) console.log(pc.green("   ✅ Authorization signed"));

  if (dryRun) {
    if (!jsonOutput) console.log(pc.yellow("   🧪 DRY-RUN MODE"));
    return true;
  }

  // ==================== Retry + EIP-1559 Gas Strategy ====================
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Динамическая оценка газа и fees
      const estimatedGas = await publicClient.estimateGas({
        account: sponsorAccount,
        to: sourceAccount.address,
        authorizationList: [authorization],
      });

      const fees = await publicClient.estimateFeesPerGas();

      const hash = await walletClient.sendTransaction({
        to: sourceAccount.address,
        authorizationList: [authorization],
        gas: (estimatedGas * 135n) / 100n,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
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
      if (attempt === MAX_RETRIES) {
        if (!jsonOutput) console.error(pc.red(`   ❌ Failed after ${MAX_RETRIES} attempts:`), err.message);
        throw err;
      }

      if (!jsonOutput) {
        console.warn(pc.yellow(`   ⚠️  Attempt ${attempt} failed. Retrying in ${RETRY_DELAY/1000}s...`));
      }
      await sleep(RETRY_DELAY);
    }
  }
}
