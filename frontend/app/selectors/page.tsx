'use client';

import React, { useState } from 'react';
import { NetworkSelector, NetworkBadge } from '@/components/NetworkSelector';
import { TokenSelector, TokenBadge } from '@/components/TokenSelector';
import type { Chain, Token } from '@/lib/chain-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Copy, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2,
  ArrowRight,
  Wallet,
  Network,
  Coins
} from 'lucide-react';

export default function SelectorsPage() {
  // Form state
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // Example state
  const [exampleChainId, setExampleChainId] = useState<number | null>(null);
  const [exampleToken, setExampleToken] = useState<Token | null>(null);

  const handleNetworkChange = (chainId: number, chain: Chain) => {
    setSelectedChainId(chainId);
    setSelectedChain(chain);
    // Reset token when network changes
    setSelectedToken(null);
  };

  const handleTokenChange = (token: Token) => {
    setSelectedToken(token);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`
Form Submitted!

Network: ${selectedChain?.name} (${selectedChainId})
Token: ${selectedToken?.symbol} - ${selectedToken?.name}
Amount: ${amount} ${selectedToken?.symbol}
Wallet: ${walletAddress}

This is just a demo. In a real app, this would process the transaction.
    `);
  };

  const isFormValid = selectedChainId && selectedToken && amount && walletAddress;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Network & Token Selectors
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Interactive demo of blockchain network and token selection components
          </p>
        </div>

        <Tabs defaultValue="interactive" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="interactive">Interactive Demo</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="details">Selection Details</TabsTrigger>
          </TabsList>

          {/* Interactive Demo Tab */}
          <TabsContent value="interactive" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Selection Form */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Token Transfer Form
                  </CardTitle>
                  <CardDescription>
                    Select network, token, and enter transfer details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Network Selection */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Network className="h-4 w-4" />
                        Blockchain Network
                      </Label>
                      <NetworkSelector
                        value={selectedChainId}
                        onChange={handleNetworkChange}
                        includeTestnets={true}
                        placeholder="Choose a blockchain network"
                      />
                      {selectedChain && (
                        <p className="text-xs text-muted-foreground">
                          Native Currency: {selectedChain.nativeCurrency.symbol}
                        </p>
                      )}
                    </div>

                    {/* Token Selection */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        Token
                      </Label>
                      <TokenSelector
                        chainId={selectedChainId}
                        value={selectedToken?.address}
                        onChange={handleTokenChange}
                        placeholder="Choose a token"
                      />
                      {selectedToken && (
                        <p className="text-xs text-muted-foreground">
                          Decimals: {selectedToken.decimals}
                        </p>
                      )}
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                      <Label htmlFor="amount">
                        Amount {selectedToken && `(${selectedToken.symbol})`}
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={!selectedToken}
                        step="0.000001"
                        min="0"
                      />
                    </div>

                    {/* Wallet Address Input */}
                    <div className="space-y-2">
                      <Label htmlFor="wallet">Recipient Wallet Address</Label>
                      <Input
                        id="wallet"
                        type="text"
                        placeholder="0x..."
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                      />
                    </div>

                    {/* Submit Button */}
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={!isFormValid}
                    >
                      {isFormValid ? (
                        <>
                          Submit Transfer
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      ) : (
                        'Fill all fields to continue'
                      )}
                    </Button>

                    {/* Info Alert */}
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        This is a demo page. No actual transactions will be processed.
                      </AlertDescription>
                    </Alert>
                  </form>
                </CardContent>
              </Card>

              {/* Right Column - Selection Summary */}
              <div className="space-y-6">
                {/* Current Selection Card */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle>Current Selection</CardTitle>
                    <CardDescription>
                      View your selected network and token details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Network Info */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground">Network</h3>
                      {selectedChain ? (
                        <div className="p-4 bg-secondary rounded-lg space-y-2">
                          <NetworkBadge chainId={selectedChain.id} />
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Chain ID:</span>
                              <span className="font-mono font-semibold">{selectedChain.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Type:</span>
                              <span className={selectedChain.testnet ? 'text-orange-500' : 'text-green-500'}>
                                {selectedChain.testnet ? 'Testnet' : 'Mainnet'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Native Token:</span>
                              <span className="font-semibold">
                                {selectedChain.nativeCurrency.symbol}
                              </span>
                            </div>
                            {selectedChain.blockExplorers && (
                              <div className="pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => window.open(selectedChain.blockExplorers?.default.url, '_blank')}
                                >
                                  <ExternalLink className="h-3 w-3 mr-2" />
                                  View Block Explorer
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 bg-secondary rounded-lg text-center text-muted-foreground">
                          No network selected
                        </div>
                      )}
                    </div>

                    {/* Token Info */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground">Token</h3>
                      {selectedToken ? (
                        <div className="p-4 bg-secondary rounded-lg space-y-2">
                          <TokenBadge token={selectedToken} />
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Symbol:</span>
                              <span className="font-semibold">{selectedToken.symbol}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Name:</span>
                              <span className="font-semibold truncate max-w-[200px]">
                                {selectedToken.name}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Decimals:</span>
                              <span className="font-mono">{selectedToken.decimals}</span>
                            </div>
                            {selectedToken.address !== '0x0000000000000000000000000000000000000000' && (
                              <div className="pt-2 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Contract:</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6"
                                    onClick={() => copyToClipboard(selectedToken.address, 'address')}
                                  >
                                    {copied === 'address' ? (
                                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                                <code className="text-xs font-mono bg-background p-2 rounded block break-all">
                                  {selectedToken.address}
                                </code>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 bg-secondary rounded-lg text-center text-muted-foreground">
                          {selectedChainId ? 'No token selected' : 'Select a network first'}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Transaction Preview */}
                {isFormValid && (
                  <Card className="shadow-lg border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <CheckCircle2 className="h-5 w-5" />
                        Transaction Preview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span>Network:</span>
                        <span className="font-semibold">{selectedChain?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Token:</span>
                        <span className="font-semibold">{selectedToken?.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-semibold">{amount} {selectedToken?.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>To:</span>
                        <span className="font-mono text-xs">
                          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Examples Tab */}
          <TabsContent value="examples" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Example 1: Filtered Networks */}
              <Card>
                <CardHeader>
                  <CardTitle>Example 1: Filtered Networks</CardTitle>
                  <CardDescription>
                    Only show Ethereum, Base, and Polygon networks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <NetworkSelector
                    value={exampleChainId}
                    onChange={(chainId) => {
                      setExampleChainId(chainId);
                      setExampleToken(null);
                    }}
                    filterChainIds={[1, 8453, 137, 84532, 11155111, 80002]}
                    includeTestnets={true}
                  />
                  <TokenSelector
                    chainId={exampleChainId}
                    value={exampleToken?.address}
                    onChange={setExampleToken}
                  />
                  {exampleChainId && exampleToken && (
                    <Alert>
                      <AlertDescription>
                        Selected: {exampleToken.symbol} on Chain {exampleChainId}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Example 2: Stablecoins Only */}
              <Card>
                <CardHeader>
                  <CardTitle>Example 2: Stablecoins Only</CardTitle>
                  <CardDescription>
                    Only show USDC, USDT, and DAI tokens
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <NetworkSelector
                    value={exampleChainId}
                    onChange={(chainId) => {
                      setExampleChainId(chainId);
                      setExampleToken(null);
                    }}
                    includeTestnets={true}
                  />
                  <TokenSelector
                    chainId={exampleChainId}
                    value={exampleToken?.address}
                    onChange={setExampleToken}
                    filterTokens={['USDC', 'USDT', 'DAI']}
                  />
                  {exampleToken && (
                    <Alert>
                      <AlertDescription>
                        Stablecoin: {exampleToken.symbol}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Example 3: Mainnet Only */}
              <Card>
                <CardHeader>
                  <CardTitle>Example 3: Mainnet Only</CardTitle>
                  <CardDescription>
                    Hide testnet networks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <NetworkSelector
                    value={exampleChainId}
                    onChange={(chainId) => {
                      setExampleChainId(chainId);
                      setExampleToken(null);
                    }}
                    includeTestnets={false}
                  />
                  <TokenSelector
                    chainId={exampleChainId}
                    value={exampleToken?.address}
                    onChange={setExampleToken}
                  />
                </CardContent>
              </Card>

              {/* Example 4: Custom Styling */}
              <Card>
                <CardHeader>
                  <CardTitle>Example 4: Custom Styling</CardTitle>
                  <CardDescription>
                    Custom colored borders
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <NetworkSelector
                    value={exampleChainId}
                    onChange={(chainId) => {
                      setExampleChainId(chainId);
                      setExampleToken(null);
                    }}
                    className="border-2 border-blue-500"
                  />
                  <TokenSelector
                    chainId={exampleChainId}
                    value={exampleToken?.address}
                    onChange={setExampleToken}
                    className="border-2 border-green-500"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Component Information</CardTitle>
                <CardDescription>
                  Technical details about the selected network and token
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Network Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Network Details</h3>
                    {selectedChain ? (
                      <pre className="bg-secondary p-4 rounded-lg overflow-x-auto text-xs">
{JSON.stringify(selectedChain, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-muted-foreground">No network selected</p>
                    )}
                  </div>

                  {/* Token Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Token Details</h3>
                    {selectedToken ? (
                      <pre className="bg-secondary p-4 rounded-lg overflow-x-auto text-xs">
{JSON.stringify(selectedToken, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-muted-foreground">No token selected</p>
                    )}
                  </div>

                  {/* Code Example */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Usage Code</h3>
                    <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs">
{`import { NetworkSelector, TokenSelector } from '@/components';

const [chainId, setChainId] = useState<number | null>(null);
const [token, setToken] = useState<Token | null>(null);

<NetworkSelector
  value={chainId}
  onChange={(chainId, chain) => setChainId(chainId)}
  includeTestnets={true}
/>

<TokenSelector
  chainId={chainId}
  value={token?.address}
  onChange={setToken}
/>`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold">About these components:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Access to 100+ blockchain networks from wagmi</li>
                  <li>20,000+ tokens from Uniswap and Superbridge token lists</li>
                  <li>Automatic testnet USDC support for 7 testnets</li>
                  <li>Smart search and filtering capabilities</li>
                  <li>Fully customizable with className prop</li>
                  <li>Type-safe with full TypeScript support</li>
                </ul>
                <p className="pt-2">
                  <strong>Documentation:</strong> See <code className="bg-secondary px-2 py-1 rounded">frontend/components/README-SELECTORS.md</code> for full API documentation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

