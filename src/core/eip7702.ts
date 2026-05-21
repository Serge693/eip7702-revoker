import {
  createPublicClient,
  createWalletClient,
  http,
  zeroAddress,
  formatEther,
} from "viem";
import pc from "picocolors";
import { sleep } from "../utils/sleep.js";
import { ZKSYNC_CHAIN_ID } from "../networks/index.js";

const MAX_RETRIES = 3;
const RETRY_DELAY = 2500;
const DEFAULT_VERIFY_DELAY = 3000;
const TX_TIMEOUT = 90_000;

export interface EIP7702TxParams {
  network: any;
  sourceAccount: any;
  sponsorAccount: any;
  contractAddress?: any;
  dryRun?: boolean;
  customRpc?: string | null;
  manualNonce?: number | null;
  jsonOutput?: boolean;
  minSponsorBalance?: number;
  verifyDelay?: number;
}

export interface NetworkResult {
  network: string;
  chainId: number;
  success: boolean;
  error?: string;
}

async function verifyDelegationStatus(
  publicClient: any,
  address: any,
  expectedRevoked = true,
): Promise<{ success: boolean; message: string }> {
  try {
    await sleep(DEFAULT_VERIFY_DELAY);

    const code = await publicClient.getCode({
      address,
      blockTag: "latest",
    });

    const hasDelegation =
      typeof code === "string" && code.toLowerCase().startsWith("0xef0100");

    if (expectedRevoked) {
      return hasDelegation
        ? { success: false, message: "Delegation still present after revoke" }
        : { success: true, message: "Delegation successfully revoked" };
    }
    return hasDelegation
      ? { success: true, message: `Delegation active -> ${code.slice(0, 48)}` }
      : { success: false, message: "Delegation not detected yet (may need more confirmations)" };
  } catch {
    return { success: false, message: "Could not verify delegation status" };
  }
}

export async function sendEIP7702Tx(params: EIP7702TxParams): Promise<boolean> {
  const {
    network,
    sourceAccount,
    sponsorAccount,
    contractAddress = zeroAddress,
    dryRun = false,
    customRpc = null,
    manualNonce = null,
    jsonOutput = false,
    minSponsorBalance = 0.003,
    verifyDelay = DEFAULT_VERIFY_DELAY,
  } = params;

  const transport = customRpc ? http(customRpc) : http(network.rpcUrls.default.http[0]);
  const publicClient = createPublicClient({ chain: network, transport });
  const walletClient = createWalletClient({
    account: sponsorAccount,
    chain: network,
    transport,
  });

  const log = (msg: string, color?: (s: string) => string) => {
    if (!jsonOutput) {
      console.log(color ? color(msg) : msg);
    }
  };

  log(`\n-> ${network.name} (Chain ID: ${network.id})`, pc.cyan);

  // --- Pre-flight checks ---

  // 1. RPC health
  try {
    const chainId = await publicClient.getChainId();
    if (chainId !== network.id) {
      const err = `RPC returned chain ID ${chainId}, expected ${network.id}`;
      log(`  ${err}`, pc.red);
      throw new Error(err);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`  RPC health check failed: ${msg}`, pc.red);
    throw new Error(`RPC health check failed for ${network.name}: ${msg}`);
  }

  log("  RPC OK", pc.green);

  // 2. Sponsor balance check
  const sponsorBalance = await publicClient.getBalance({
    address: sponsorAccount.address,
  });
  const sponsorBalanceEth = Number(formatEther(sponsorBalance));
  if (sponsorBalanceEth < minSponsorBalance) {
    const err = `Sponsor balance (${sponsorBalanceEth.toFixed(6)} ETH) is below minimum (${minSponsorBalance} ETH)`;
    log(`  ${err}`, pc.red);
    throw new Error(err);
  }
  log(`  Sponsor: ${sponsorBalanceEth.toFixed(6)} ETH`, pc.green);

  // 3. zkSync warning
  if (network.id === ZKSYNC_CHAIN_ID) {
    log(
      "  zkSync Era may not support EIP-7702 in the standard way. Proceed with caution.",
      pc.yellow,
    );
  }

  // --- Check current delegation status ---
  const codeBefore = await publicClient.getCode({
    address: sourceAccount.address,
    blockTag: "latest",
  });
  const hasDelegationBefore =
    typeof codeBefore === "string" && codeBefore.toLowerCase().startsWith("0xef0100");

  if (!hasDelegationBefore && contractAddress === zeroAddress) {
    log("  No active delegation. Nothing to revoke.", pc.green);
    return true;
  }

  log(
    hasDelegationBefore
      ? `  Active delegation detected -> ${(codeBefore as string).slice(0, 48)}`
      : "  No active delegation",
    hasDelegationBefore ? pc.yellow : pc.green,
  );

  // --- Sign authorization ---
  const nonce =
    manualNonce !== null && manualNonce !== undefined
      ? manualNonce
      : await publicClient.getTransactionCount({
          address: sourceAccount.address,
          blockTag: "pending",
        });

  const authorization = await sourceAccount.signAuthorization({
    contractAddress,
    chainId: network.id,
    nonce,
  });

  log("  Authorization signed", pc.green);

  if (dryRun) {
    log("  DRY-RUN: transaction not sent", pc.yellow);
    return true;
  }

  // --- Send transaction with retries ---
  let txHash: string | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const estimatedGas = await publicClient.estimateGas({
        account: sponsorAccount.address,
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

      log(`  Tx: ${txHash}`, pc.blue);
      log(`  ${network.blockExplorers?.default?.url}/tx/${txHash}`);

      break;
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        throw err;
      }
      log(
        `  Attempt ${attempt} failed, retrying in ${RETRY_DELAY / 1000}s...`,
        pc.yellow,
      );
      await sleep(RETRY_DELAY);
    }
  }

  // --- Wait for confirmation ---
  let confirmed = false;
  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash!,
      confirmations: 1,
      timeout: TX_TIMEOUT,
    });
    confirmed = receipt.status === "success";
    log(confirmed ? "  Transaction confirmed" : "  Transaction failed (reverted)", pc[confirmed ? "green" : "red"]);
  } catch (err: any) {
    if (err?.name === "WaitForTransactionReceiptTimeoutError") {
      log("  Timeout (90s). Transaction may still confirm:", pc.yellow);
      log(`  ${network.blockExplorers?.default?.url}/tx/${txHash}`);
      return true;
    }
    throw err;
  }

  // --- Verification ---
  if (confirmed && !jsonOutput) {
    log("\n  Verifying delegation status...", pc.cyan);
    await sleep(verifyDelay);
    const verification = await verifyDelegationStatus(
      publicClient,
      sourceAccount.address,
      contractAddress === zeroAddress,
    );
    log(
      `  ${verification.message}`,
      verification.success ? pc.green : pc.yellow,
    );
  }

  return confirmed;
}
