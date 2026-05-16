// eip7702-utils.mjs
import { createPublicClient, createWalletClient, http, zeroAddress, parseEther } from 'viem';
import pc from 'picocolors';

export async function checkCurrentDelegation(publicClient, address) {
  try {
    const code = await publicClient.getCode({ address });
    const hasDelegation = code && code !== '0x' && code !== '0x0';
    return { 
      delegated: hasDelegation 
    };
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

  const sponsorBalance = await publicClient.getBalance({ address: sponsorAccount.address });
  const balance = Number(sponsorBalance) / 1e18;
  console.log(`   Sponsor balance: ${balance.toFixed(4)} ${network.nativeCurrency.symbol}`);

  if (balance < 0.003) {
    console.log(pc.red("   ❌ Insufficient sponsor balance"));
    return false;
  }

  const status = await checkCurrentDelegation(publicClient, sourceAccount.address);
  console.log(status.delegated 
    ? pc.yellow("   ⚠️  Already has delegation (code present)") 
    : pc.green("   ✓ No active delegation"));

  const nonce = manualNonce !== null 
    ? Number(manualNonce) 
    : await publicClient.getTransactionCount({ address: sourceAccount.address });

  const authorization = await sourceAccount.signAuthorization({
    contractAddress,
    chainId: network.id,
    nonce,
  });

  console.log(pc.green("   ✅ Authorization signed"));

  if (dryRun) {
    console.log(pc.yellow("   🧪 DRY-RUN MODE — transaction not sent"));
    return true;
  }

  let gas = 120000n;
  try {
    gas = await publicClient.estimateGas({
      account: sponsorAccount,
      to: sourceAccount.address,
      authorizationList: [authorization],
    });
  } catch (e) {
    console.warn(pc.yellow("   ⚠️  Gas estimation failed, using safe default"));
  }

  const hash = await walletClient.sendTransaction({
    to: sourceAccount.address,
    authorizationList: [authorization],
    gas: (gas * 130n) / 100n, // +30% margin
  });

  console.log(pc.blue(`   📤 Transaction: ${hash}`));
  console.log(`   🔗 ${network.blockExplorers?.default?.url}/tx/${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 90000 });
  const success = receipt.status === 'success';
  console.log(success ? pc.green("   ✅ SUCCESS") : pc.red("   ❌ FAILED"));
  return success;
}
