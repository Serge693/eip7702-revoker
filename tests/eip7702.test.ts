import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock viem BEFORE importing the module under test
vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...(actual as object),
    createPublicClient: vi.fn(() => mockPublicClient),
    createWalletClient: vi.fn(() => mockWalletClient),
    http: vi.fn(() => "mockTransport"),
  };
});

const mockPublicClient = {
  getChainId: vi.fn(),
  getBalance: vi.fn(),
  getCode: vi.fn(),
  getTransactionCount: vi.fn(),
  estimateGas: vi.fn(),
  estimateFeesPerGas: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
};

const mockWalletClient = {
  sendTransaction: vi.fn(),
};

const mockSignAuthorization = vi.fn();
const mockAccount = {
  address: "0x" + "a".repeat(40) as `0x${string}`,
  signAuthorization: mockSignAuthorization,
};

import * as viem from "viem";
import { sendEIP7702Tx } from "../src/core/eip7702.js";

const mockChain = {
  id: 1,
  name: "Ethereum",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://eth.llamarpc.com"] } },
  blockExplorers: { default: { url: "https://etherscan.io" } },
} as unknown as ReturnType<typeof viem.defineChain>;

describe("sendEIP7702Tx", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPublicClient.getChainId.mockResolvedValue(1);
    mockPublicClient.getBalance.mockResolvedValue(BigInt("10000000000000000")); // 0.01 ETH
    mockPublicClient.getCode.mockResolvedValue("0xef0100" + "0".repeat(40));
    mockPublicClient.getTransactionCount.mockResolvedValue(5);
    mockPublicClient.estimateGas.mockResolvedValue(BigInt(100000));
    mockPublicClient.estimateFeesPerGas.mockResolvedValue({
      maxFeePerGas: BigInt(20000000000),
      maxPriorityFeePerGas: BigInt(1000000000),
    });
    mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
      status: "success",
    });

    mockSignAuthorization.mockResolvedValue({
      r: "0x0",
      s: "0x0",
      v: 27n,
      contractAddress: "0x" + "0".repeat(40) as `0x${string}`,
      chainId: 1,
      nonce: 5,
    });

    mockWalletClient.sendTransaction.mockResolvedValue(
      "0x" + "c".repeat(64) as `0x${string}`,
    );
  });

  it("revokes delegation when active delegation exists", async () => {
    const result = await sendEIP7702Tx({
      network: mockChain,
      sourceAccount: mockAccount as any,
      sponsorAccount: mockAccount as any,
    });

    expect(result).toBe(true);
    expect(mockWalletClient.sendTransaction).toHaveBeenCalledOnce();
  });

  it("skips transaction when no active delegation and revoking", async () => {
    mockPublicClient.getCode.mockResolvedValue("0x");

    const result = await sendEIP7702Tx({
      network: mockChain,
      sourceAccount: mockAccount as any,
      sponsorAccount: mockAccount as any,
    });

    expect(result).toBe(true);
    expect(mockWalletClient.sendTransaction).not.toHaveBeenCalled();
  });

  it("throws when sponsor balance is too low", async () => {
    mockPublicClient.getBalance.mockResolvedValue(BigInt("100000000000000")); // 0.0001 ETH

    await expect(
      sendEIP7702Tx({
        network: mockChain,
        sourceAccount: mockAccount as any,
        sponsorAccount: mockAccount as any,
        minSponsorBalance: 0.003,
      }),
    ).rejects.toThrow("below minimum");
  });

  it("throws when RPC chain ID mismatches", async () => {
    mockPublicClient.getChainId.mockResolvedValue(999);

    await expect(
      sendEIP7702Tx({
        network: mockChain,
        sourceAccount: mockAccount as any,
        sponsorAccount: mockAccount as any,
      }),
    ).rejects.toThrow("RPC health check failed");
  });

  it("does not send transaction in dry-run mode", async () => {
    const result = await sendEIP7702Tx({
      network: mockChain,
      sourceAccount: mockAccount as any,
      sponsorAccount: mockAccount as any,
      dryRun: true,
    });

    expect(result).toBe(true);
    expect(mockWalletClient.sendTransaction).not.toHaveBeenCalled();
  });
});
