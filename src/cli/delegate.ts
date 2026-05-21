import { Command } from "commander";
import { isAddress, getAddress, zeroAddress } from "viem";
import pc from "picocolors";
import { sendEIP7702Tx, type NetworkResult } from "../core/eip7702.js";
import {
  networks,
  getNetworkByName,
  getNetworks,
  deduplicateNetworks,
} from "../networks/index.js";
import {
  version,
  sourceAccount,
  sponsorAccount,
  delegateTo as cfgDelegateTo,
  minSponsorBalance,
  verifyDelay,
} from "../config/index.js";

export const delegateCommand = new Command("delegate")
  .description("Delegate EIP-7702 authorization to a contract address")
  .option(
    "-n, --network <networks>",
    'Networks (comma separated) or "all"',
    "ethereum",
  )
  .option(
    "--to <address>",
    "Contract address to delegate to (overrides DELEGATE_TO in .env)",
  )
  .option("--dry-run", "Simulate only, do not broadcast")
  .option("--rpc <url>", "Custom RPC URL")
  .option("--nonce <number>", "Manual nonce override")
  .option("-y, --yes", "Skip confirmation prompt")
  .option("--json", "Output result as JSON")
  .action(executeDelegate);

async function executeDelegate(options: Record<string, unknown>): Promise<void> {
  const opts = options as {
    network: string;
    to?: string;
    dryRun?: boolean;
    rpc?: string;
    nonce?: string;
    yes?: boolean;
    json?: boolean;
  };

  const jsonOutput = !!opts.json;
  const log = (msg: string, color?: (s: string) => string) => {
    if (!jsonOutput) {
      console.log(color ? color(msg) : msg);
    }
  };

  if (!jsonOutput) {
    console.log(pc.bold(pc.magenta(`\nEIP-7702 Delegator v${version}\n`)));
  }

  // Resolve delegate address
  const rawDelegateTo = opts.to || cfgDelegateTo;

  if (!rawDelegateTo) {
    console.error(
      pc.red(
        "Delegate address required. Use --to 0x... or set DELEGATE_TO in .env",
      ),
    );
    process.exit(1);
  }

  if (!isAddress(rawDelegateTo)) {
    console.error(pc.red(`Invalid address: ${rawDelegateTo}`));
    process.exit(1);
  }

  if (rawDelegateTo.toLowerCase() === zeroAddress) {
    console.error(
      pc.red("Cannot delegate to zero address. Use revoke command to revoke."),
    );
    process.exit(1);
  }

  const delegateTo = getAddress(rawDelegateTo);

  // Resolve networks
  let selectedNetworks = getNetworksForOption(opts.network);
  selectedNetworks = deduplicateNetworks(selectedNetworks);

  if (selectedNetworks.length === 0) {
    if (jsonOutput) {
      console.log(JSON.stringify({ success: false, error: "no_valid_networks" }));
    } else {
      console.error(pc.red(`No valid networks found for: "${opts.network}"`));
      console.error(pc.gray(`Available: ${Object.keys(networks).join(", ")}`));
    }
    process.exit(1);
  }

  const networkNames = selectedNetworks.map((n) => n.name);

  if (!jsonOutput) {
    console.log(`    Source:      ${sourceAccount.address}`);
    console.log(`    Delegate to: ${delegateTo}`);
  }

  // Confirmation
  if (!opts.yes && !opts.dryRun && !jsonOutput) {
    console.log(
      pc.yellow(`\nAbout to DELEGATE on ${networkNames.length} network(s):`),
    );
    console.log(pc.cyan("    " + networkNames.join(", ")));
    console.log(
      pc.yellow(`\n    Delegate target: ${delegateTo}`),
    );
    console.log(
      pc.yellow(
        "    Double-check the address - delegating to a malicious contract is dangerous.\n",
      ),
    );

    const readline = await import("readline/promises");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await rl.question('Type "yes" to continue: ');
    rl.close();
    if (answer.toLowerCase() !== "yes") {
      console.log(pc.yellow("Operation cancelled."));
      return;
    }
  }

  log(`\nDelegating on: ${networkNames.join(", ")}`, pc.cyan);

  // Execute on all networks in parallel
  const tasks = selectedNetworks.map((network) =>
    sendEIP7702Tx({
      network,
      sourceAccount,
      sponsorAccount,
      contractAddress: delegateTo as `0x${string}`,
      dryRun: !!opts.dryRun,
      customRpc: opts.rpc || null,
      manualNonce: opts.nonce != null ? Number(opts.nonce) : null,
      jsonOutput,
      minSponsorBalance,
      verifyDelay,
    })
      .then(
        (success): NetworkResult => ({
          network: network.name,
          chainId: network.id,
          success,
        }),
      )
      .catch(
        (err: Error): NetworkResult => ({
          network: network.name,
          chainId: network.id,
          success: false,
          error: err.message,
        }),
      ),
  );

  const results = (await Promise.allSettled(tasks)).map(
    (r) => (r.status === "fulfilled" ? r.value : (r.reason as NetworkResult)),
  );
  const allSuccess = results.every((r) => r.success);

  if (jsonOutput) {
    console.log(JSON.stringify({ success: allSuccess, results }, null, 2));
  } else {
    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      console.log(
        pc.yellow(`\nCompleted with ${failed.length} failure(s):`),
      );
      failed.forEach((r) =>
        console.log(
          pc.red(`    x ${r.network}: ${r.error ?? "unknown error"}`),
        ),
      );
    } else {
      console.log(pc.green("\nAll done!"));
    }
  }
}

function getNetworksForOption(networkOpt: string) {
  if (networkOpt.toLowerCase() === "all") {
    return getNetworks();
  }
  return networkOpt
    .split(",")
    .map((n) => n.trim())
    .map((name) => getNetworkByName(name))
    .filter((n): n is NonNullable<typeof n> => n !== null);
}
