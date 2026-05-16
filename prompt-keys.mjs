// prompt-keys.mjs
import pc from 'picocolors';
import readline from 'readline/promises';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

export async function promptForKeys() {
  console.log(pc.cyan("\n🔐 Interactive Private Key Input (recommended for security)"));

  const sourceKey = await rl.question('Enter SOURCE private key: ');
  const sponsorKey = await rl.question('Enter SPONSOR private key: ');
  const delegate = await rl.question('Enter DELEGATE_TO (optional): ');

  rl.close();

  return {
    SOURCE_PRIVATE_KEY: sourceKey.trim(),
    SPONSOR_PRIVATE_KEY: sponsorKey.trim(),
    DELEGATE_TO: delegate.trim() || null
  };
}