// eip7702-utils.mjs
import { createPublicClient, createWalletClient, http, zeroAddress } from 'viem';
import pc from 'picocolors';

const MIN_BALANCE_PER_CHAIN = {
  1: 0.008, 42161: 0.003, 8453: 0.003, 10: 0.003,
  137: 0.004, 56: 0.002, 100: 0.005, 59144: 0.003,
};

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

  const result = { network: network.name, chainId: network.id, success: false };

  console.log(pc.cyan(`\n→ ${network.name} (Chain ID: ${network.id})`));

  // 1. Проверка текущего байткода (делегации)
  const code = await publicClient.getCode({ address: sourceAccount.address });
  const hasDelegation = code && code !== '0x' && code !== '0x0';

  if (!hasDelegation && contractAddress === zeroAddress) {
    console.log(pc.yellow("   ⚠️  No active delegation. Nothing to revoke."));
    if (jsonOutput) console.log(JSON.stringify({ ...result, skipped: true, reason: "no delegation" }));
    return true;
  }

  console.log(hasDelegation 
    ? pc.yellow("   ⚠️  Active delegation detected") 
    : pc.green("   ✓ No active delegation"));

  // 2. Nonce
  const nonce = manualNonce !== null 
    ? Number(manualNonce)
    : await publicClient.getTransactionCount({ address: sourceAccount.address, blockTag: 'pending' });

  // 3. Подпись
  const authorization = await sourceAccount.signAuthorization({
    contractAddress,
    chainId: network.id,
    nonce,
  });

  console.log(pc.green("   ✅ Authorization signed"));

  if (dryRun) {
    console.log(pc.yellow("   🧪 DRY-RUN MODE"));
    if (jsonOutput) {
      console.log(JSON.stringify({ ...result, dryRun: true, nonce, delegateTo: contractAddress }));
    }
    return true;
  }

  // 4. Динамическая проверка баланса + gas
  const balance = await publicClient.getBalance({ address: sponsorAccount.address });
  const balanceEth = Number(balance) / 1e18;
  const minBal = MIN_BALANCE_PER_CHAIN[network.id] || 0.003;

  if (balanceEth < minBal) {
    console.log(pc.red(`   ❌ Insufficient balance (${balanceEth.toFixed(4)} < ${minBal})`));
    if (jsonOutput) console.log(JSON.stringify({ ...result, error: "insufficient_balance" }));
    return false;
  }

  // 5. Отправка
  let gas = 120000n;
  try {
    gas = await publicClient.estimateGas({
      account: sponsorAccount,
      to: sourceAccount.address,
      authorizationList: [authorization],
    });
  } catch {}

  const hash = await walletClient.sendTransaction({
    to: sourceAccount.address,
    authorizationList: [authorization],
    gas: (gas * 135n) / 100n,
  });

  console.log(pc.blue(`   📤 Tx: ${hash}`));
  console.log(`   🔗 ${network.blockExplorers?.default?.url}/tx/${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 90000 });
  result.success = receipt.status === 'success';

  console.log(result.success ? pc.green("   ✅ SUCCESS") : pc.red("   ❌ FAILED"));

  if (jsonOutput) {
    console.log(JSON.stringify({ ...result, txHash: hash, status: receipt.status }));
  }

  return result.success;
}
