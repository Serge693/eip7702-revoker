const HEX_REGEX = /^[0-9a-fA-F]+$/;

export function validatePrivateKey(pk: string, name: string): void {
  if (!pk.startsWith("0x")) {
    throw new Error(`${name} must start with 0x`);
  }
  if (pk.length !== 66) {
    throw new Error(`${name} must be 66 characters (0x + 64 hex). Got ${pk.length}.`);
  }
  if (!HEX_REGEX.test(pk.slice(2))) {
    throw new Error(`${name} contains invalid hex characters`);
  }
}
