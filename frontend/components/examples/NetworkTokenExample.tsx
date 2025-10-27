'use client';

/**
 * Example component demonstrating how to use NetworkSelector and TokenSelector
 * This file shows various usage patterns for the network and token selection components
 */

import React, { useState } from 'react';
import { NetworkSelector, NetworkBadge } from '../NetworkSelector';
import { TokenSelector, TokenBadge, NetworkTokenSelector } from '../TokenSelector';
import type { Chain, Token } from '@/lib/chain-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export function NetworkTokenExample() {
  // Example 1: Separate Network and Token Selectors
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  // Example 2: Combined selector
  const [combinedChainId, setCombinedChainId] = useState<number | null>(null);
  const [combinedToken, setCombinedToken] = useState<Token | null>(null);

  const handleNetworkChange = (chainId: number, chain: Chain) => {
    setSelectedChainId(chainId);
    setSelectedChain(chain);
    // Reset token when network changes
    setSelectedToken(null);
  };

  const handleTokenChange = (token: Token) => {
    setSelectedToken(token);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Network & Token Selector Examples</h1>
        <p className="text-muted-foreground">
          Examples showing how to use the NetworkSelector and TokenSelector components
        </p>
      </div>

      {/* Example 1: Separate Selectors */}
      <Card>
        <CardHeader>
          <CardTitle>Example 1: Separate Selectors</CardTitle>
          <CardDescription>
            Use NetworkSelector and TokenSelector independently for maximum flexibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Network</label>
            <NetworkSelector
              value={selectedChainId}
              onChange={handleNetworkChange}
              includeTestnets={true}
              placeholder="Choose a blockchain network"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Select Token</label>
            <TokenSelector
              chainId={selectedChainId}
              value={selectedToken?.address}
              onChange={handleTokenChange}
              placeholder="Choose a token"
            />
          </div>

          {/* Display selected values */}
          <div className="pt-4 border-t space-y-2">
            <h3 className="font-semibold">Selected Values:</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Network: </span>
                {selectedChain ? (
                  <NetworkBadge chainId={selectedChain.id} />
                ) : (
                  <span className="text-sm text-muted-foreground">None selected</span>
                )}
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Token: </span>
                {selectedToken ? (
                  <TokenBadge token={selectedToken} showAddress />
                ) : (
                  <span className="text-sm text-muted-foreground">None selected</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example 2: Combined Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Example 2: Combined Selector</CardTitle>
          <CardDescription>
            Use NetworkTokenSelector for a unified network and token selection experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NetworkTokenSelector
            selectedChainId={combinedChainId}
            selectedToken={combinedToken}
            onChainChange={(chainId) => {
              setCombinedChainId(chainId);
              setCombinedToken(null); // Reset token on network change
            }}
            onTokenChange={setCombinedToken}
            includeTestnets={true}
          />

          <div className="pt-4 border-t space-y-2">
            <h3 className="font-semibold">Selected Values:</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Chain ID: </span>
                <span className="font-mono">{combinedChainId || 'None'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Token: </span>
                <span className="font-mono">
                  {combinedToken ? `${combinedToken.symbol} (${combinedToken.address})` : 'None'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example 3: With Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Example 3: Filtered Selectors</CardTitle>
          <CardDescription>
            Limit available options using filterChainIds and filterTokens props
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Network (Ethereum, Base, Polygon only)
            </label>
            <NetworkSelector
              value={selectedChainId}
              onChange={handleNetworkChange}
              filterChainIds={[1, 8453, 137, 84532, 11155111]} // Mainnet: Ethereum, Base, Polygon + some testnets
              includeTestnets={true}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Select Token (Stablecoins only)
            </label>
            <TokenSelector
              chainId={selectedChainId}
              value={selectedToken?.address}
              onChange={handleTokenChange}
              filterTokens={['USDC', 'USDT', 'DAI']} // Only show stablecoins
            />
          </div>
        </CardContent>
      </Card>

      {/* Example 4: Custom Styling */}
      <Card>
        <CardHeader>
          <CardTitle>Example 4: Custom Styling</CardTitle>
          <CardDescription>
            Both components accept className prop for custom styling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Custom Styled Network Selector</label>
            <NetworkSelector
              value={selectedChainId}
              onChange={handleNetworkChange}
              className="border-2 border-blue-500 hover:border-blue-600 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Custom Styled Token Selector</label>
            <TokenSelector
              chainId={selectedChainId}
              value={selectedToken?.address}
              onChange={handleTokenChange}
              className="border-2 border-green-500 hover:border-green-600 focus:ring-green-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Code Example */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Code Example</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs">
{`import { NetworkSelector, TokenSelector } from '@/components';
import type { Chain, Token } from '@/lib/chain-data';

function MyComponent() {
  const [chainId, setChainId] = useState<number | null>(null);
  const [token, setToken] = useState<Token | null>(null);

  return (
    <>
      <NetworkSelector
        value={chainId}
        onChange={(chainId, chain) => setChainId(chainId)}
        includeTestnets={true}
      />
      
      <TokenSelector
        chainId={chainId}
        value={token?.address}
        onChange={(token) => setToken(token)}
      />
    </>
  );
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

