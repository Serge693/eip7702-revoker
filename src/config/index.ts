import { config as dotenvConfig } from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { isAddress, getAddress } from "viem";
import pc from "picocolors";
import { createRequire } from "module";
import { validatePrivateKey } from "../utils/validate.js";

dotenvConfig({ path: ".env" });

const { version } = createRequire(import.meta.url)("../../package.json");

const SOURCE_PK = process.env.SOURCE_PRIVATE_KEY?.trim();
const LEGACY_PK = process.env.VICTIM_PRIVATE_KEY?.trim();
const SPONSOR_PK = process.env.SPONSOR_PRIVATE_KEY?.trim();
const rawDelegateTo: string | undefined = process.env.DELEGATE_TO?.trim() || undefined;

const privateKey = SOURCE_PK ?? LEGACY_PK;

const isHelpOrVersion = () =>
  process.argv.includes("--help") || process.argv.includes("-h") ||
  process.argv.includes("--version") || process.argv.includes("-V");

if (!privateKey && !isHelpOrVersion()) {
  console.error(pc.red("SOURCE_PRIVATE_KEY (or VICTIM_PRIVATE_KEY) is required in .env"));
  process.exit(1);
}
if (!SPONSOR_PK && !isHelpOrVersion()) {
  console.error(pc.red("SPONSOR_PRIVATE_KEY is required in .env"));
  process.exit(1);
}

if (privateKey) {
  validatePrivateKey(privateKey, "SOURCE_PRIVATE_KEY");
}
if (SPONSOR_PK) {
  validatePrivateKey(SPONSOR_PK, "SPONSOR_PRIVATE_KEY");
}

if (LEGACY_PK && !SOURCE_PK) {
  console.warn(pc.yellow("VICTIM_PRIVATE_KEY is deprecated. Rename to SOURCE_PRIVATE_KEY in .env"));
}

const sourceAccount = privateKey ? privateKeyToAccount(privateKey as `0x${string}`) : null;
const sponsorAccount = SPONSOR_PK ? privateKeyToAccount(SPONSOR_PK as `0x${string}`) : null;

let delegateTo: string | null = null;
if (rawDelegateTo && rawDelegateTo !== "0x...") {
  if (!isAddress(rawDelegateTo)) {
    console.warn(pc.yellow(`DELEGATE_TO is not a valid address, ignoring: ${rawDelegateTo}`));
  } else {
    delegateTo = getAddress(rawDelegateTo);
  }
}

const minSponsorBalance = parseFloat(process.env.SPONSOR_MIN_BALANCE ?? "0.003");
const verifyDelay = parseInt(process.env.EIP7702_VERIFY_DELAY ?? "3000", 10);

export { privateKey, SPONSOR_PK, version, sourceAccount, sponsorAccount, delegateTo, minSponsorBalance, verifyDelay };
