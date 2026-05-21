import pc from "picocolors";
import readline from "readline/promises";

export interface InteractiveKeys {
  SOURCE_PRIVATE_KEY: string;
  SPONSOR_PRIVATE_KEY: string;
  DELEGATE_TO: string | null;
}

export async function promptForKeys(): Promise<InteractiveKeys> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log(pc.cyan("\nInteractive Private Key Input"));
    console.log(
      pc.gray(
        "   Keys are used only in memory and are never logged, saved, or transmitted.\n",
      ),
    );

    const sourceKey = await rl.question("   SOURCE private key  (0x...): ");
    const sponsorKey = await rl.question("   SPONSOR private key (0x...): ");
    const delegate = await rl.question(
      "   DELEGATE_TO address (optional, Enter to skip): ",
    );

    const trimmed = {
      SOURCE_PRIVATE_KEY: sourceKey.trim(),
      SPONSOR_PRIVATE_KEY: sponsorKey.trim(),
      DELEGATE_TO: delegate.trim() || null,
    };

    for (const [name, value] of [
      ["SOURCE_PRIVATE_KEY", trimmed.SOURCE_PRIVATE_KEY] as const,
      ["SPONSOR_PRIVATE_KEY", trimmed.SPONSOR_PRIVATE_KEY] as const,
    ]) {
      if (!value.startsWith("0x") || value.length !== 66) {
        console.error(
          pc.red(`\n${name} looks invalid (expected 0x + 64 hex chars)`),
        );
        process.exit(1);
      }
    }

    return trimmed;
  } finally {
    rl.close();
  }
}
