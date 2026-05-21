import { describe, it, expect } from "vitest";
import { validatePrivateKey } from "../src/utils/validate.js";

describe("validatePrivateKey", () => {
  it("accepts a valid private key", () => {
    expect(() =>
      validatePrivateKey(
        "0x" + "a".repeat(64),
        "TEST_KEY",
      ),
    ).not.toThrow();
  });

  it("rejects a key without 0x prefix", () => {
    expect(() =>
      validatePrivateKey("abc123", "TEST_KEY"),
    ).toThrow("must start with 0x");
  });

  it("rejects a key with wrong length", () => {
    expect(() =>
      validatePrivateKey("0xabc", "TEST_KEY"),
    ).toThrow("must be 66 characters");
  });

  it("rejects a key with invalid hex characters", () => {
    expect(() =>
      validatePrivateKey("0x" + "z".repeat(64), "TEST_KEY"),
    ).toThrow("contains invalid hex characters");
  });
});
