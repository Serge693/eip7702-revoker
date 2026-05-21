#!/usr/bin/env node
import { Command } from "commander";
import { version } from "./config/index.js";
import { revokeCommand } from "./cli/revoke.js";
import { delegateCommand } from "./cli/delegate.js";
import { promptForKeys } from "./interactive.js";

const program = new Command();

program
  .name("eip7702")
  .description("CLI tool to revoke and delegate EIP-7702 authorizations")
  .version(version)
  .option(
    "-i, --interactive",
    "Prompt for private keys interactively (bypass .env)",
  );

program.addCommand(revokeCommand);
program.addCommand(delegateCommand);

// Global hook: if --interactive is set, prompt for keys and set env vars
program.hook("preAction", async (thisCommand) => {
  const opts = thisCommand.optsWithGlobals();
  if (opts.interactive) {
    const keys = await promptForKeys();
    process.env.SOURCE_PRIVATE_KEY = keys.SOURCE_PRIVATE_KEY;
    process.env.SPONSOR_PRIVATE_KEY = keys.SPONSOR_PRIVATE_KEY;
    if (keys.DELEGATE_TO) {
      process.env.DELEGATE_TO = keys.DELEGATE_TO;
    }
  }
});

program.parse(process.argv);
