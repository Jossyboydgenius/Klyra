'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useSwitchChain, useConfig } from 'wagmi';
import { Web3Container, Web3Card, Web3Button } from './Web3Theme';
import { NetworkSelector } from './NetworkSelector';
import { TokenSelector } from './TokenSelector';
import { getAllChainsEnhanced, getCombinedTokensForChain, getChainByIdEnhanced } from '@/lib/chain-data';
import { getSquidTokensForChain } from '@/lib/squid-tokens';
import { chainToWalletFormat } from '@/lib/chainid-network';
import type { Chain, Token } from '@/lib/chain-data';
import { ArrowLeft, Plus, Check, Loader2, Network, Coins } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NetworkTokenAdderProps {
  onBack?: () => void;
}

export function NetworkTokenAdder({ onBack }: NetworkTokenAdderProps) {
  const router = useRouter();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const config = useConfig();
  
  const [mode, setMode] = useState<'network' | 'token'>('network');
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availableChains, setAvailableChains] = useState<Chain[]>([]);
  const [isLoadingChains, setIsLoadingChains] = useState(true);

  // Load enhanced chains (including chainid.network)
  useEffect(() => {
    setIsLoadingChains(true);
    getAllChainsEnhanced()
      .then(chains => {
        setAvailableChains(chains);
      })
      .catch(err => {
        console.error('Error loading chains:', err);
        setAvailableChains([]);
      })
      .finally(() => setIsLoadingChains(false));
  }, []);

  // Get tokens for selected chain (including Squid tokens for testnets)
  const [squidTokens, setSquidTokens] = useState<Token[]>([]);
  const [isLoadingSquidTokens, setIsLoadingSquidTokens] = useState(false);

  useEffect(() => {
    if (selectedChainId && selectedChain?.testnet) {
      setIsLoadingSquidTokens(true);
      getSquidTokensForChain(selectedChainId, true)
        .then(tokens => {
          const convertedTokens: Token[] = tokens.map(t => ({
            chainId: t.chainId,
            address: t.address,
            name: t.name,
            symbol: t.symbol,
            decimals: t.decimals,
            logoURI: t.logoURI,
          }));
          setSquidTokens(convertedTokens);
        })
        .catch(err => {
          console.error('Error loading Squid tokens:', err);
          setSquidTokens([]);
        })
        .finally(() => setIsLoadingSquidTokens(false));
    } else {
      setSquidTokens([]);
    }
  }, [selectedChainId, selectedChain]);

  const handleNetworkChange = async (chainId: number, chain: Chain) => {
    setSelectedChainId(chainId);
    setSelectedChain(chain);
    setSelectedToken(null);
    setError('');
    setSuccess('');
    
    // If chain is not fully loaded, try to get enhanced chain data
    if (!chain.rpcUrls || !chain.rpcUrls.default?.http?.length) {
      try {
        const enhancedChain = await getChainByIdEnhanced(chainId);
        if (enhancedChain) {
          setSelectedChain(enhancedChain);
        }
      } catch (err) {
        console.error('Error loading enhanced chain data:', err);
      }
    }
  };

  const handleTokenChange = (token: Token) => {
    setSelectedToken(token);
    setError('');
    setSuccess('');
  };

  // Get all tokens for selected chain (combining regular + Squid tokens)
  const allTokensForChain = useMemo(() => {
    if (!selectedChainId) return [];
    
    const regularTokens = getCombinedTokensForChain(selectedChainId);
    const tokensMap = new Map<string, Token>();
    
    // Add regular tokens
    regularTokens.forEach(token => {
      const key = token.address.toLowerCase();
      tokensMap.set(key, token);
    });
    
    // Add Squid tokens (won't override existing)
    squidTokens.forEach(token => {
      const key = token.address.toLowerCase();
      if (!tokensMap.has(key)) {
        tokensMap.set(key, token);
      }
    });
    
    return Array.from(tokensMap.values());
  }, [selectedChainId, squidTokens]);

  const handleAddNetwork = async () => {
    if (!selectedChain || !isConnected) {
      setError('Please connect your wallet and select a network');
      return;
    }

    if (!(window as any).ethereum) {
      setError('No wallet detected. Please install MetaMask or another Web3 wallet.');
      return;
    }

    setIsAdding(true);
    setError('');
    setSuccess('');

    try {
      // Check if chain is already in wallet config
      const chainInConfig = config.chains.find(c => c.id === selectedChain.id);
      
      if (chainInConfig) {
        // Chain already configured, just switch to it
        if (chainId !== selectedChain.id) {
          try {
            await switchChain({ chainId: selectedChain.id });
            setSuccess(`Switched to ${selectedChain.name}`);
          } catch (switchErr: any) {
            // If switch fails, try using window.ethereum directly
            await (window as any).ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${selectedChain.id.toString(16)}` }],
            });
            setSuccess(`Switched to ${selectedChain.name}`);
          }
        } else {
          setSuccess(`${selectedChain.name} is already active`);
        }
      } else {
        // Need to add chain to wallet using window.ethereum.request
        // This is more reliable than Wagmi's addChain for all chains
        const chainParams = chainToWalletFormat(selectedChain);
        
        // Ensure we have at least one RPC URL
        if (!chainParams.rpcUrls || chainParams.rpcUrls.length === 0) {
          throw new Error('No RPC URLs available for this chain');
        }

        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [chainParams],
        });
        
        setSuccess(`Added ${selectedChain.name} to your wallet`);
        
        // Optionally switch to the newly added chain
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainParams.chainId }],
          });
        } catch (switchErr) {
          // Ignore switch errors - chain was added successfully
        }
      }
    } catch (err: any) {
      console.error('Error adding network:', err);
      if (err?.code === 4001 || err?.message?.includes('User rejected') || err?.message?.includes('User denied')) {
        setError('Network addition cancelled by user');
      } else if (err?.code === 4902) {
        // Chain not added yet, try again
        setError('Chain not found. Please try adding it again.');
      } else {
        setError(err?.message || 'Failed to add network. Please try again.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddToken = async () => {
    if (!selectedToken || !selectedChain || !isConnected) {
      setError('Please connect your wallet and select a token');
      return;
    }

    // Native tokens don't need to be added
    if (selectedToken.address === '0x0000000000000000000000000000000000000000') {
      setError('Native tokens are automatically available. No need to add them.');
      return;
    }

    setIsAdding(true);
    setError('');
    setSuccess('');

    try {
      // Check if we need to switch chain first
      if (chainId !== selectedToken.chainId) {
        const chainInConfig = config.chains.find(c => c.id === selectedToken.chainId);
        if (!chainInConfig) {
          setError('Please add the network first before adding tokens');
          setIsAdding(false);
          return;
        }
        await switchChain({ chainId: selectedToken.chainId });
      }

      // Request to add token to wallet
      const wasAdded = await (window as any).ethereum?.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: selectedToken.address,
            symbol: selectedToken.symbol,
            decimals: selectedToken.decimals,
            image: selectedToken.logoURI || '',
          },
        },
      });

      if (wasAdded) {
        setSuccess(`Added ${selectedToken.symbol} to your wallet`);
      } else {
        setError('Token addition cancelled or failed');
      }
    } catch (err: any) {
      console.error('Error adding token:', err);
      if (err?.message?.includes('User rejected') || err?.message?.includes('User denied')) {
        setError('Token addition cancelled by user');
      } else {
        setError(err?.message || 'Failed to add token. Please try again.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  if (!isConnected) {
    return (
      <Web3Container>
        <Web3Card className="p-6 text-center">
          <Network className="w-12 h-12 text-indigo-200/70 mx-auto mb-3" />
          <p className="text-indigo-200/70 mb-3">Connect your wallet to add networks and tokens</p>
        </Web3Card>
      </Web3Container>
    );
  }

  return (
    <Web3Container>
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">Add Network or Token</h1>
            <p className="text-indigo-200/80 text-sm">Add networks and tokens to your wallet</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <Web3Button
            variant={mode === 'network' ? 'primary' : 'secondary'}
            onClick={() => {
              setMode('network');
              setSelectedToken(null);
              setError('');
              setSuccess('');
            }}
            className="flex items-center gap-2"
          >
            <Network className="w-4 h-4" />
            Add Network
          </Web3Button>
          <Web3Button
            variant={mode === 'token' ? 'primary' : 'secondary'}
            onClick={() => {
              setMode('token');
              setSelectedChainId(null);
              setSelectedChain(null);
              setError('');
              setSuccess('');
            }}
            className="flex items-center gap-2"
          >
            <Coins className="w-4 h-4" />
            Add Token
          </Web3Button>
        </div>
      </div>

      {mode === 'network' ? (
        <Web3Card>
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Select Network to Add</h2>
              <NetworkSelector
                value={selectedChainId}
                onChange={handleNetworkChange}
                includeTestnets={true}
                placeholder={isLoadingChains ? "Loading networks..." : "Select a network"}
                customChains={availableChains}
                disabled={isLoadingChains}
              />
              {selectedChain && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg">
                  <h3 className="font-semibold text-white mb-2">{selectedChain.name}</h3>
                  <div className="space-y-1 text-sm text-indigo-200/80">
                    <p>Chain ID: {selectedChain.id}</p>
                    <p>Native Currency: {selectedChain.nativeCurrency.symbol}</p>
                    {selectedChain.testnet && (
                      <p className="text-orange-400">Testnet Network</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-lg">
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-500/20 border border-green-400/30 rounded-lg flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                <p className="text-green-300">{success}</p>
              </div>
            )}

            <Web3Button
              onClick={handleAddNetwork}
              disabled={!selectedChain || isAdding}
              className="w-full"
            >
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Adding Network...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-5 w-5" />
                  Add Network to Wallet
                </>
              )}
            </Web3Button>
          </div>
        </Web3Card>
      ) : (
        <Web3Card>
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Select Token to Add</h2>
              
              {/* Network Selection First */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-white mb-2">
                  Select Network
                </label>
                <NetworkSelector
                  value={selectedChainId}
                  onChange={handleNetworkChange}
                  includeTestnets={true}
                  placeholder={isLoadingChains ? "Loading networks..." : "Select network first"}
                  customChains={availableChains}
                  disabled={isLoadingChains}
                  className="text-black"
                />
              </div>

              {/* Token Selection */}
              {selectedChainId && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Select Token
                    {isLoadingSquidTokens && (
                      <span className="ml-2 text-xs text-indigo-300">(Loading from Squid...)</span>
                    )}
                  </label>
                  <TokenSelector
                    chainId={selectedChainId}
                    value={selectedToken?.address}
                    onChange={handleTokenChange}
                    placeholder="Select token"
                  />
                  {selectedToken && (
                    <div className="mt-4 p-4 bg-white/5 rounded-lg">
                      <h3 className="font-semibold text-white mb-2">{selectedToken.name}</h3>
                      <div className="space-y-1 text-sm text-indigo-200/80">
                        <p>Symbol: {selectedToken.symbol}</p>
                        <p>Decimals: {selectedToken.decimals}</p>
                        <p className="text-xs font-mono text-indigo-300/70 break-all">
                          {selectedToken.address}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-lg">
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-500/20 border border-green-400/30 rounded-lg flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                <p className="text-green-300">{success}</p>
              </div>
            )}

            <Web3Button
              onClick={handleAddToken}
              disabled={!selectedToken || isAdding || !selectedChainId}
              className="w-full"
            >
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Adding Token...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-5 w-5" />
                  Add Token to Wallet
                </>
              )}
            </Web3Button>
          </div>
        </Web3Card>
      )}
    </Web3Container>
  );
}

