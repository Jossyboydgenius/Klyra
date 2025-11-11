/**
 * Multicall3 Utility
 * Batch multiple contract calls into a single RPC call to avoid rate limiting
 * Uses Multicall3 contract: https://www.multicall3.com/deployments
 */

import { Address, encodeFunctionData, decodeFunctionResult, erc20Abi } from 'viem';
import type { Chain } from '@/lib/chain-data';
import type { Token } from '@/lib/chain-data';

// Multicall3 ABI (minimal - only what we need)
export const multicall3Abi = [
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'target', type: 'address' },
          { internalType: 'bytes', name: 'callData', type: 'bytes' },
        ],
        internalType: 'struct Multicall3.Call[]',
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'aggregate',
    outputs: [
      { internalType: 'uint256', name: 'blockNumber', type: 'uint256' },
      { internalType: 'bytes[]', name: 'returnData', type: 'bytes[]' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'target', type: 'address' },
          { internalType: 'bool', name: 'allowFailure', type: 'bool' },
          { internalType: 'bytes', name: 'callData', type: 'bytes' },
        ],
        internalType: 'struct Multicall3.Call3[]',
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'aggregate3',
    outputs: [
      {
        components: [
          { internalType: 'bool', name: 'success', type: 'bool' },
          { internalType: 'bytes', name: 'returnData', type: 'bytes' },
        ],
        internalType: 'struct Multicall3.Result[]',
        name: 'returnData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

// Multicall3 deployed addresses (from https://www.multicall3.com/deployments)
// Multicall3 is deployed at the same address on all EVM chains
export const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11' as Address;

/**
 * Get Multicall3 address for a chain
 * Multicall3 is deployed at the same address on all EVM chains
 */
export function getMulticall3Address(chainId: number): Address {
  // Multicall3 uses CREATE2 to deploy to the same address on all chains
  return MULTICALL3_ADDRESS;
}

/**
 * Create a token balance call for Multicall3 (legacy - kept for compatibility)
 * Note: The new executeMulticall function doesn't use this, but it's kept for reference
 */
export function getTokenBalanceCall(
  token: Token,
  userAddress: Address
): { target: Address; callData: `0x${string}` } {
  // Encode balanceOf(address) call
  const callData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress],
  });

  return {
    target: token.address as Address,
    callData,
  };
}

/**
 * Execute multicall using viem's built-in multicall (uses Multicall3 automatically)
 * This is the recommended approach as viem handles Multicall3 internally
 */
export async function executeMulticall(
  publicClient: any, // viem PublicClient
  tokens: Token[],
  userAddress: Address
): Promise<Array<{ token: Token; balance: bigint; success: boolean }>> {
  if (tokens.length === 0) {
    return [];
  }

  try {
    // Use viem's multicall which automatically uses Multicall3
    const { multicall } = await import('viem');
    
    // Prepare calls for viem multicall
    const calls = tokens.map(token => ({
      address: token.address as Address,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [userAddress],
    }));

    // Execute multicall - viem handles Multicall3 automatically
    // Note: viem's multicall automatically detects and uses Multicall3 if available
    const results = await multicall({
      client: publicClient,
      contracts: calls,
    });

    // Process results
    return results.map((result, index) => {
      const token = tokens[index];
      let balance = 0n;
      let success = false;

      if (result.status === 'success' && result.result !== undefined) {
        balance = result.result as bigint;
        success = true;
      }

      return {
        token,
        balance,
        success,
      };
    });
  } catch (error) {
    console.error('Multicall execution error:', error);
    // Return all failures
    return tokens.map(token => ({
      token,
      balance: 0n,
      success: false,
    }));
  }
}

/**
 * Batch tokens by chain for multicall execution
 */
export function batchTokensByChain(tokens: Token[]): Map<number, Token[]> {
  const batches = new Map<number, Token[]>();

  tokens.forEach(token => {
    const chainTokens = batches.get(token.chainId) || [];
    chainTokens.push(token);
    batches.set(token.chainId, chainTokens);
  });

  return batches;
}

