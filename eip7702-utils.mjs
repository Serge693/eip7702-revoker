// eip7702-utils.mjs
import { createPublicClient, createWalletClient, http, zeroAddress, parseEther } from 'viem';
import pc from 'picocolors';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2500;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Проверка статуса делегации после выполнения
async function verifyDelegationStatus(publicClient, address, expectedRevoked = true) {
  try {
    const code = await publicClient.getCode({ address });
    const hasDelegation = code && code !== '0x' && code !== '0x0';

    if (expectedRevoked) {
      return !hasDelegation 
        ? { success: true, message: "✓ Delegation successfully revoked (no code)" }
        : { success: false, message: "⚠️  Delegation still present" };
    } else {
      return hasDelegation 
        ? { success: true, message: "✓ Delegation active" }
        : { success: false, message: "⚠️  No delegation detected" };
    }
  } catch (err) {
    return { success: false, message: "❌ Could not verify status" };
  }
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
  const walletClient = createWalletClient({ account: sponsorAccount, chain: network, transport });

  if (!jsonOutput) console.log(pc.cyan(`\n→ ${network.name} (Chain ID: ${network.id})`));

  // Проверка перед операцией
  const codeBefore = await publicClient.getCode({ address: sourceAccount.address });
  const hasDelegationBefore = codeBefore && codeBefore !== '0x' && codeBefore !== '0x0';

  if (!hasDelegationBefore && contractAddress === zeroAddress) {
    if (!jsonOutput) console.log(pc.yellow("   ⚠️  No active delegation. Nothing to revoke."));
    return true;
  }

  if (!jsonOutput) {
    console.log(hasDelegationBefore 
      ? pc.yellow("   ⚠️  Active delegation detected") 
      : pc.green("   ✓ No active delegation"));
  }

  const nonce = manualNonce !== null 
    ? Number(manualNonce)
    : await publicClient.getTransactionCount({ address: sourceAccount.address, blockTag: 'pending' });

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

  // Основная операция с retry
  let txHash = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const estimatedGas = await publicClient.estimateGas({
        account: sponsorAccount,
        to: sourceAccount.address,
        authorizationList: [authorization],
      });

      const fees = await publicClient.estimateFeesPerGas();

      txHash = await walletClient.sendTransaction({
        to: sourceAccount.address,
        authorizationList: [authorization],
        gas: (estimatedGas * 135n) / 100n,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      });

      if (!jsonOutput) {
        console.log(pc.blue(`   📤 Transaction: ${txHash}`));
        console.log(`   🔗 ${network.blockExplorers?.default?.url}/tx/${txHash}`);
      }

      break; // Успешно отправили
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      if (!jsonOutput) console.warn(pc.yellow(`   ⚠️  Attempt ${attempt} failed, retrying...`));
      await sleep(RETRY_DELAY);
    }
  }

  // Ожидание подтверждения
  const receipt = await publicClient.waitForTransactionReceipt({ 
    hash: txHash, 
    confirmations: 1, 
    timeout: 90000 
  });

  const success = receipt.status === 'success';
  if (!jsonOutput) console.log(success ? pc.green("   ✅ Transaction confirmed") : pc.red("   ❌ Transaction failed"));

  // === Проверка статуса через eip7702.app логику (локально) ===
  if (success && !jsonOutput) {
    console.log(pc.cyan("\n   🔍 Verifying final delegation status..."));
    const verification = await verifyDelegationStatus(
      publicClient, 
      sourceAccount.address, 
      contractAddress === zeroAddress
    );
    console.log(verification.message);
  }

  return success;
}
