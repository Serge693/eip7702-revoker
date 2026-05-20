// eip7702-utils.mjs

import { createPublicClient, createWalletClient, http, zeroAddress } from 'viem';
import pc from 'picocolors';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2500;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Проверяет статус делегации EIP-7702.
 *
 * ИСПРАВЛЕНО: старый код проверял code !== '0x' что ловило любой контрактный код.
 * EIP-7702 delegation designator всегда начинается с 0xef0100 — проверяем именно его.
 */
async function verifyDelegationStatus(publicClient, address, expectedRevoked = true) {
  try {
    const code = await publicClient.getCode({ address });

    // EIP-7702 delegation designator: 0xef0100<address(20 bytes)>
    const hasDelegation = typeof code === 'string' && code.toLowerCase().startsWith('0xef0100');

    if (expectedRevoked) {
      return hasDelegation
        ? { success: false, message: '⚠️  Delegation still present after revoke' }
        : { success: true,  message: '✓  Delegation successfully revoked' };
    } else {
      return hasDelegation
        ? { success: true,  message: `✓  Delegation active → ${code.slice(0, 48)}` }
        : { success: false, message: '⚠️  No EIP-7702 delegation detected' };
    }
  } catch {
    return { success: false, message: '❌  Could not verify delegation status' };
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
  jsonOutput = false,
}) {
  const transport = customRpc
    ? http(customRpc)
    : http(network.rpcUrls.default.http[0]);

  const publicClient  = createPublicClient({ chain: network, transport });
  const walletClient  = createWalletClient({ account: sponsorAccount, chain: network, transport });

  if (!jsonOutput) console.log(pc.cyan(`\n→ ${network.name} (Chain ID: ${network.id})`));

  // Проверка делегации перед операцией
  const codeBefore = await publicClient.getCode({ address: sourceAccount.address });
  const hasDelegationBefore = typeof codeBefore === 'string' && codeBefore.toLowerCase().startsWith('0xef0100');

  if (!hasDelegationBefore && contractAddress === zeroAddress) {
    if (!jsonOutput) console.log(pc.yellow('  ⚠️  No EIP-7702 delegation found. Nothing to revoke.'));
    return true;
  }

  if (!jsonOutput) {
    console.log(hasDelegationBefore
      ? pc.yellow('  ⚠️  Active EIP-7702 delegation detected')
      : pc.green('  ✓  No active delegation'));
  }

  // Nonce владельца (не спонсора!)
  const nonce = manualNonce !== null
    ? Number(manualNonce)
    : await publicClient.getTransactionCount({
        address: sourceAccount.address,
        blockTag: 'pending',
      });

  const authorization = await sourceAccount.signAuthorization({
    contractAddress,
    chainId: network.id,
    nonce,
  });

  if (!jsonOutput) console.log(pc.green('  ✅  Authorization signed'));

  if (dryRun) {
    if (!jsonOutput) console.log(pc.yellow('  🧪  DRY-RUN: transaction not sent'));
    return true;
  }

  // Отправка с retry
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
        console.log(pc.blue(`  📤  Tx: ${txHash}`));
        console.log(`  🔗  ${network.blockExplorers?.default?.url}/tx/${txHash}`);
      }

      break; // успешно отправили

    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      if (!jsonOutput) console.warn(pc.yellow(`  ⚠️  Attempt ${attempt} failed, retrying in ${RETRY_DELAY / 1000}s...`));
      await sleep(RETRY_DELAY);
    }
  }

  // Ожидание подтверждения
  // ИСПРАВЛЕНО: обёрнуто в try/catch — при таймауте процесс больше не падает.
  let success = false;
  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
      timeout: 90_000,
    });
    success = receipt.status === 'success';
    if (!jsonOutput) {
      console.log(success
        ? pc.green('  ✅  Transaction confirmed')
        : pc.red('  ❌  Transaction failed (reverted)'));
    }
  } catch (err) {
    // WaitForTransactionReceiptTimeoutError — транзакция ещё может подтвердиться
    if (err.name === 'WaitForTransactionReceiptTimeoutError') {
      if (!jsonOutput) {
        console.log(pc.yellow('  ⏱   Timeout (90s). Transaction may still confirm:'));
        console.log(`  🔗  ${network.blockExplorers?.default?.url}/tx/${txHash}`);
      }
      return true; // не считаем провалом — пользователь может проверить вручную
    }
    throw err;
  }

  // Верификация результата
  if (success && !jsonOutput) {
    console.log(pc.cyan('\n  🔍  Verifying final delegation status...'));
    const verification = await verifyDelegationStatus(
      publicClient,
      sourceAccount.address,
      contractAddress === zeroAddress,
    );
    console.log(verification.success
      ? pc.green(`  ${verification.message}`)
      : pc.yellow(`  ${verification.message}`));
  }

  return success;
}
