import { createPublicClient, createWalletClient, http, zeroAddress, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, mainnet, bsc, arbitrum, optimism, polygon, gnosis, linea, blast, mode, soneium } from 'viem/chains';

// ====================== CONFIGURATION ======================
const VICTIM_PRIVATE_KEY = "0x...";     // Account that will delegate its rights
const SPONSOR_PRIVATE_KEY = "0x...";    // Account that pays gas
const DELEGATE_TO = "0x...";            // Address to delegate to

const NETWORK = base;                   // Change network here
// const NETWORK = mainnet;
// const NETWORK = bsc;
// ===========================================================

const publicClient = createPublicClient({
    chain: NETWORK,
    transport: http()
});

const victimAccount = privateKeyToAccount(VICTIM_PRIVATE_KEY);
const sponsorAccount = privateKeyToAccount(SPONSOR_PRIVATE_KEY);

async function main() {
    console.log(`Network: ${NETWORK.name} (Chain ID: ${NETWORK.id})`);
    console.log(`Victim: ${victimAccount.address}`);
    console.log(`Delegate To: ${DELEGATE_TO}`);
    console.log(`Sponsor: ${sponsorAccount.address}\n`);

    const balance = await publicClient.getBalance({ address: victimAccount.address });
    console.log(`Victim balance: ${formatEther(balance)} ${NETWORK.nativeCurrency.symbol}`);

    const nonce = await publicClient.getTransactionCount({
        address: victimAccount.address
    });

    // Sign authorization to delegate
    const authorization = await victimAccount.signAuthorization({
        contractAddress: DELEGATE_TO,
        chainId: NETWORK.id,
        nonce: nonce,
    });

    console.log("✅ Authorization signed (delegate)");

    const walletClient = createWalletClient({
        account: sponsorAccount,
        chain: NETWORK,
        transport: http()
    });

    console.log("🚀 Sending delegation transaction...");

    const hash = await walletClient.sendTransaction({
        to: victimAccount.address,
        authorizationList: [authorization],
        gas: 400000n,
    });

    console.log(`\n✅ Transaction sent!`);
    console.log(`Explorer: https://${NETWORK.blockExplorers.default.url}/tx/${hash}`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Status: ${receipt.status === 'success' ? 'SUCCESS ✅' : 'FAILED ❌'}`);
}

main().catch(err => {
    console.error("\n❌ Error:");
    console.error(err);
});