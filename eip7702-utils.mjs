// eip7702-utils.mjs
import { createPublicClient, createWalletClient, http, zeroAddress, parseEther } from 'viem';
import pc from 'picocolors';

export async function checkCurrentDelegation(publicClient, address) {
  try {
    const code = await publicClient.getCode({ address });
    const hasDelegation = code && code !== '0x' && code !== '0x0';
    return { 
      delegated: hasDelegation, 
      delegate: hasDelegation ? 'Check on block explorer' : null 
    };
  } catch {
    return { delegated: false, delegate: null };
  }
}

export async function sendEIP7702Tx({
  network,
  victimAccount,
  sponsorAccount,
  contractAddress = zeroAddress,
  dryRun = false,
  customRpc = null,
  manualNonce = null
}) {
  const transport = customRpc 
    ? http(customRpc) 
    : http(network.rpcUrls.default.http[0]);

  const publicClient = createPublicClient({ chain: network, transport });
  const walletClient = createWalletClient({ 
    account: sponsorAccount, 
    chain: network, 
    transport 
  });

  console.log(pc.cyan(`\n→ ${network.name} (Chain ID: ${network.id})`));

  const sponsorBalance = await publicClient.getBalance({ address: sponsorAccount.address });
  const balanceEth = Number(sponsorBalance) / 1e18;
  console.log(`   Sponsor balance: ${balanceEth.toFixed(4)} ${network.nativeCurrency.symbol}`);

  if (balanceEth < 0.003) {
    console.log(pc.red("   ❌ Insufficient sponsor balance"));
    return false;
  }

  const delegationStatus = await checkCurrentDelegation(publicClient, victimAccount.address);
  console.log(delegationStatus.delegated 
    ? pc.yellow(`   ⚠️  Already has delegation (code present)`) 
    : pc.green("   ✓ No active delegation detected"));

  const nonce = manualNonce !== null 
    ? Number(manualNonce) 
    : await publicClient.getTransactionCount({ address: victimAccount.address });

  const authorization = await victimAccount.signAuthorization({
    contractAddress,
    chainId: network.id,
    nonce,
  });

  console.log(pc.green("   ✅ Authorization signed"));

  if (dryRun) {
    console.log(pc.yellow("   🧪 DRY-RUN MODE — transaction not sent"));
    return true;
  }

  // === Улучшенная оценка газа ===
  let gas = 120000n; // Более высокий дефолт

  try {
    gas = await publicClient.estimateGas({
      account: sponsorAccount,
      to: victimAccount.address,
      authorizationList: [authorization],
    });
    console.log(pc.gray(`   Gas estimated: ${gas}`));
  } catch (e) {
    console.warn(pc.yellow(`   ⚠️  Gas estimation failed, using safe default 120000`));
  }

  try {
    const hash = await walletClient.sendTransaction({
      to: victimAccount.address,
      authorizationList: [authorization],
      gas: gas * 120n / 100n,   // +20% margin
    });

    console.log(pc.blue(`   📤 Transaction hash: ${hash}`));
    console.log(`   🔗 Explorer: ${network.blockExplorers?.default?.url}/tx/${hash}`);

    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash, 
      confirmations: 1,
      timeout: 90000 
    });

    const success = receipt.status === 'success';
    console.log(success ? pc.green("   ✅ SUCCESS") : pc.red("   ❌ FAILED"));
    return success;

  } catch (err) {
    console.error(pc.red("   ❌ Error sending transaction:"), err.message);
    return false;
  }
}

export const MIN_SPONSOR_BALANCE = 0.003;
