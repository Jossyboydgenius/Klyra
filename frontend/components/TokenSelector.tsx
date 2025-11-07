/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useMemo } from 'react';
import { Check, ChevronDown, Search, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getCombinedTokensForChain,
  searchTokens,
  type Token,
  getChainById,
} from '@/lib/chain-data';
import { useEnhancedTokens } from '@/hooks/useEnhancedTokens';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface TokenSelectorProps {
  chainId: number | null; // Required: chain ID to fetch tokens for
  value?: string | null; // Token address or symbol
  onChange: (token: Token) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  filterTokens?: string[]; // Optional: only show specific token symbols
}

export function TokenSelector({
  chainId,
  value,
  onChange,
  className,
  placeholder = 'Select token',
  disabled = false,
  filterTokens,
}: TokenSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get enhanced tokens (including Squid tokens for testnets)
  const { tokens: enhancedTokens, isLoading: isLoadingSquid } = useEnhancedTokens(chainId);

  // Get all tokens for the selected chain
  const allTokens = useMemo(() => {
    if (!chainId) return [];
    
    // Use enhanced tokens if available (includes Squid tokens for testnets)
    let tokens = enhancedTokens.length > 0 ? enhancedTokens : getCombinedTokensForChain(chainId);
    
    if (filterTokens && filterTokens.length > 0) {
      tokens = tokens.filter(token => 
        filterTokens.includes(token.symbol) || 
        filterTokens.includes(token.address.toLowerCase())
      );
    }
    
    return tokens;
  }, [chainId, filterTokens, enhancedTokens]);

  // Filter tokens based on search
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return allTokens;
    if (!chainId) return [];
    
    const searched = searchTokens(chainId, searchQuery);
    return allTokens.filter(token => 
      searched.some(s => s.address.toLowerCase() === token.address.toLowerCase())
    );
  }, [allTokens, chainId, searchQuery]);

  // Get selected token
  const selectedToken = useMemo(() => {
    if (!value) return null;
    return allTokens.find(token => 
      token.address.toLowerCase() === value.toLowerCase() || 
      token.symbol === value
    );
  }, [value, allTokens]);

  const handleSelect = (token: Token) => {
    onChange(token);
    setOpen(false);
    setSearchQuery('');
  };

  // Check if disabled due to no chain selected
  const isDisabled = disabled || !chainId;

  // Check if using Web3 theme (dark theme with white text)
  const isWeb3Theme = className?.includes('bg-white/5') || className?.includes('text-white');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isDisabled}
          className={cn(
            'w-full justify-between p-4 border-2 rounded-xl transition-all duration-200',
            !selectedToken && 'text-muted-foreground',
            open && isWeb3Theme && 'border-blue-500/50 bg-white/10 shadow-lg shadow-blue-500/20',
            !open && isWeb3Theme && 'border-white/20 hover:border-white/30 hover:bg-gray-500',
            !isWeb3Theme && 'hover:bg-gray-500',
            className
          )}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {selectedToken ? (
              <>
                {selectedToken.logoURI ? (
                  <div className="relative shrink-0">
                    <Image
                      src={selectedToken.logoURI}
                      alt={selectedToken.symbol}
                      width={32}
                      height={32}
                      className={cn(
                        'rounded-full object-cover w-8 h-8',
                        isWeb3Theme ? 'ring-2 ring-white/20' : ''
                      )}
                      unoptimized={true}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className={cn(
                    'shrink-0 rounded-full flex items-center justify-center',
                    isWeb3Theme ? 'w-8 h-8 bg-white/10 ring-2 ring-white/20' : 'w-8 h-8 bg-secondary'
                  )}>
                    <Coins className={cn(
                      'h-5 w-5',
                      isWeb3Theme ? 'text-white' : 'text-muted-foreground'
                    )} />
                  </div>
                )}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={cn('font-medium truncate', isWeb3Theme && 'text-white')}>
                    {selectedToken.symbol}
                  </span>
                  {selectedToken.name !== selectedToken.symbol && (
                    <span className={cn(
                      'text-xs truncate',
                      isWeb3Theme ? 'text-indigo-300/80' : 'text-muted-foreground'
                    )}>
                      {selectedToken.name}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <span className={isWeb3Theme ? 'text-indigo-200/50' : ''}>
                {!chainId ? 'Select a network first' : placeholder}
              </span>
            )}
          </div>
          <ChevronDown className={cn(
            'ml-2 h-5 w-5 shrink-0 transition-transform duration-200',
            open && 'rotate-180',
            isWeb3Theme ? 'text-white opacity-80' : 'opacity-50'
          )} />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn(
          'w-[400px] p-0',
          isWeb3Theme && 'bg-slate-900/98 backdrop-blur-xl border-2 border-white/20 shadow-2xl'
        )} 
        align="start"
      >
        <Command className={isWeb3Theme ? 'bg-transparent' : ''}>
          <div className={cn(
            'flex items-center border-b px-4 py-3',
            isWeb3Theme ? 'border-white/20' : ''
          )}>
            <Search className={cn(
              'mr-2 h-4 w-4 shrink-0',
              isWeb3Theme ? 'text-white opacity-50' : 'opacity-50'
            )} />
            <input
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-black',
                isWeb3Theme 
                  ? 'text-white placeholder:text-white' 
                  : 'placeholder:text-white'
              )}
            />
          </div>
          <div className={cn(
            'max-h-[300px] overflow-y-auto',
            isWeb3Theme && 'custom-scrollbar'
          )}>
            {isLoadingSquid ? (
              <div className={cn(
                'py-6 text-center text-sm',
                isWeb3Theme ? 'text-indigo-200/70' : 'text-muted-foreground'
              )}>
                Loading tokens from Squid...
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className={cn(
                'py-6 text-center text-sm',
                isWeb3Theme ? 'text-indigo-200/70' : 'text-muted-foreground'
              )}>
                {!chainId ? 'Select a network first' : 'No tokens found.'}
              </div>
            ) : (
              <CommandGroup>
                {filteredTokens.map((token) => {
                  const isSelected = selectedToken?.address.toLowerCase() === token.address.toLowerCase();
                  return (
                    <CommandItem
                      key={`${token.address}-${token.chainId}`}
                      value={`${token.symbol}-${token.name}-${token.address}`}
                      onSelect={() => handleSelect(token)}
                      className={cn(
                        'cursor-pointer transition-all duration-150',
                        isWeb3Theme && isSelected && 'bg-linear-to-r from-blue-500/20 to-purple-500/20 border-l-2 border-blue-400',
                        isWeb3Theme && !isSelected && 'hover:bg-gray-600 border-l-2 border-transparent',
                        isWeb3Theme && 'p-4'
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {token.logoURI ? (
                          <div className="relative shrink-0">
                            <Image
                              src={token.logoURI}
                              alt={token.symbol}
                              width={32}
                              height={32}
                              className={cn(
                                'rounded-full object-cover shrink-0',
                                isWeb3Theme ? 'w-8 h-8 ring-2 ring-white/20' : 'w-8 h-8'
                              )}
                              unoptimized={true}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            {isSelected && isWeb3Theme && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                                <Check className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                            isWeb3Theme ? 'bg-white/10 ring-2 ring-white/20' : 'bg-secondary'
                          )}>
                            <Coins className={cn(
                              'h-4 w-4',
                              isWeb3Theme ? 'text-white' : 'text-muted-foreground'
                            )} />
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={cn('font-medium truncate', isWeb3Theme && 'text-white')}>
                            {token.symbol}
                          </span>
                          {token.name !== token.symbol && (
                            <span className={cn(
                              'text-xs truncate',
                              isWeb3Theme ? 'text-indigo-300/80' : 'text-muted-foreground'
                            )}>
                              {token.name}
                            </span>
                          )}
                          {token.address !== '0x0000000000000000000000000000000000000000' && (
                            <span className={cn(
                              'text-xs truncate font-mono',
                              isWeb3Theme ? 'text-indigo-300/60' : 'text-muted-foreground'
                            )}>
                              {token.address.slice(0, 6)}...{token.address.slice(-4)}
                            </span>
                          )}
                        </div>
                        {isSelected && !isWeb3Theme && (
                          <Check className="h-4 w-4 shrink-0" />
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </div>
        </Command>
        {selectedToken && (
          <div className={cn(
            'border-t p-3',
            isWeb3Theme ? 'border-white/20 bg-white/5' : 'bg-muted/50'
          )}>
            <div className={cn(
              'text-xs space-y-1',
              isWeb3Theme ? 'text-indigo-200/70' : 'text-muted-foreground'
            )}>
              <div className="flex justify-between">
                <span>Decimals:</span>
                <span className={cn('font-medium', isWeb3Theme && 'text-white')}>
                  {selectedToken.decimals}
                </span>
              </div>
              {selectedToken.address !== '0x0000000000000000000000000000000000000000' && (
                <div className="flex justify-between items-center gap-2">
                  <span>Address:</span>
                  <span className={cn(
                    'font-mono text-xs truncate max-w-[250px]',
                    isWeb3Theme ? 'text-indigo-300/70' : ''
                  )}>
                    {selectedToken.address}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Display component for showing token info without selector
interface TokenBadgeProps {
  token: Token;
  className?: string;
  showAddress?: boolean;
}

export function TokenBadge({ token, className, showAddress = false }: TokenBadgeProps) {
  return (
    <div className={cn('inline-flex items-center gap-2 px-2 py-1 rounded-md bg-secondary text-secondary-foreground', className)}>
      {token.logoURI ? (
        <Image
          src={token.logoURI}
          alt={token.symbol}
          width={20}
          height={20}
          className="rounded-full"
          unoptimized={true}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <Coins className="h-4 w-4" />
      )}
      <div className="flex flex-col">
        <span className="text-sm font-medium">{token.symbol}</span>
        {showAddress && token.address !== '0x0000000000000000000000000000000000000000' && (
          <span className="text-xs text-muted-foreground font-mono">
            {token.address.slice(0, 6)}...{token.address.slice(-4)}
          </span>
        )}
      </div>
    </div>
  );
}

// Combined Network + Token selector
interface NetworkTokenSelectorProps {
  selectedChainId: number | null;
  selectedToken: Token | null;
  onChainChange: (chainId: number) => void;
  onTokenChange: (token: Token) => void;
  className?: string;
  includeTestnets?: boolean;
}

export function NetworkTokenSelector({
  selectedChainId,
  selectedToken,
  onChainChange,
  onTokenChange,
  className,
  includeTestnets = true,
}: NetworkTokenSelectorProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <label className="block text-sm font-medium mb-2">Network</label>
        <NetworkSelector
          value={selectedChainId}
          onChange={(chainId) => onChainChange(chainId)}
          includeTestnets={includeTestnets}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Token</label>
        <TokenSelector
          chainId={selectedChainId}
          value={selectedToken?.address}
          onChange={onTokenChange}
        />
      </div>
    </div>
  );
}

// Re-export NetworkSelector for convenience
import { NetworkSelector, NetworkBadge } from './NetworkSelector';
export { NetworkBadge };

