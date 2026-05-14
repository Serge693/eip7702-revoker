// revoke.mjs
import { Command } from 'commander';
import { createPublicClient, createWalletClient, http, zeroAddress, formatEther } from 'viem';
import * as cfg from './config.mjs';

const program = new Command();

program
    .name('revoke')
    .description('EIP-7702 Revoker — Revoke delegation')
    .option('-n, --network <networks>', 'Networks (comma separated) or all', 'base')
    .option('-d, --delay <ms>', 'Delay between networks (ms)', '800')
    .parse();

const options = program.opts();
const networksInput = options.network;
const delay = parseInt(options.delay);

async function revokeOnNetwork(network) {
    console.log(`\n🔥 Revoke → ${network.name} (Chain ID: ${network.id})`);

    const publicClient = createPublicClient({ chain: network, transport: http() });
    const walletClient = createWalletClient({ 
        account: cfg.sponsorAccount, 
        chain: network, 
        transport: http() 
    });

    try {
        const sponsorBalance = await publicClient.getBalance({ address: cfg.sponsorAccount.address });
        console.log(`   Sponsor balance: ${formatEther(sponsorBalance)} ${network.nativeCurrency.symbol}`);

        if (sponsorBalance < 3n * 10n ** 15n) {
            console.log(`   ❌ Sponsor has insufficient balance`);
            return false;
        }

        const nonce = await publicClient.getTransactionCount({ address: cfg.victimAccount.address });

        const authorization = await cfg.victimAccount.signAuthorization({
            contractAddress: zeroAddress,
            chainId: network.id,
            nonce,
        });

        console.log(`   ✅ Authorization signed`);

        const hash = await walletClient.sendTransaction({
            to: cfg.victimAccount.address,
            authorizationList: [authorization],
            gas: 450000n,
        });

        console.log(`   📤 Hash: ${hash}`);
        console.log(`   🔗 ${network.blockExplorers.default.url}/tx/${hash}`);

        const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
        console.log(`   ${receipt.status === 'success' ? '✅ SUCCESSFULLY REVOKED' : '❌ FAILED'}`);
        return true;

    } catch (err) {
        console.log(`   ❌ Error: ${err.shortMessage || err.message}`);
        return false;
    }
}

async function main() {
    console.log(`🚀 EIP-7702 Multi-Revoker`);
    console.log(`Victim: ${cfg.victimAccount.address}`);
    console.log(`Sponsor: ${cfg.sponsorAccount.address}\n`);

    const networks = cfg.getNetworks(networksInput);

    for (const network of networks) {
        await revokeOnNetwork(network);
        if (networks.indexOf(network) !== networks.length - 1) {
            await new Promise(r => setTimeout(r, delay));
        }
    }

    console.log(`\n✅ All operations completed!`);
}

main().catch(err => {
    console.error("\n💥 Critical error:", err.message);
    process.exit(1);
});
