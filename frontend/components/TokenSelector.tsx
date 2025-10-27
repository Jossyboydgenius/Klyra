'use client';

import React, { useState, useMemo } from 'react';
import { Check, ChevronDown, Search, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getCombinedTokensForChain,
  searchTokens,
  type Token,
} from '@/lib/chain-data';
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

  // Get all tokens for the selected chain
  const allTokens = useMemo(() => {
    if (!chainId) return [];
    let tokens = getCombinedTokensForChain(chainId);
    
    if (filterTokens && filterTokens.length > 0) {
      tokens = tokens.filter(token => 
        filterTokens.includes(token.symbol) || 
        filterTokens.includes(token.address.toLowerCase())
      );
    }
    
    return tokens;
  }, [chainId, filterTokens]);

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isDisabled}
          className={cn(
            'w-full justify-between',
            !selectedToken && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {selectedToken ? (
              <>
                {selectedToken.logoURI ? (
                  <Image
                    src={selectedToken.logoURI}
                    alt={selectedToken.symbol}
                    width={20}
                    height={20}
                    className="rounded-full"
                    unoptimized={true}
                    onError={(e) => {
                      // Fallback to default icon error
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <Coins className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex flex-col items-start min-w-0">
                  <span className="font-medium truncate">{selectedToken.symbol}</span>
                  {selectedToken.name !== selectedToken.symbol && (
                    <span className="text-xs text-muted-foreground truncate max-w-full">
                      {selectedToken.name}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <span>{!chainId ? 'Select a network first' : placeholder}</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {filteredTokens.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {!chainId ? 'Select a network first' : 'No tokens found.'}
              </div>
            ) : (
              <CommandGroup>
                {filteredTokens.map((token) => (
                  <CommandItem
                    key={`${token.address}-${token.chainId}`}
                    value={`${token.symbol}-${token.name}-${token.address}`}
                    onSelect={() => handleSelect(token)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {token.logoURI ? (
                        <Image
                          src={token.logoURI}
                          alt={token.symbol}
                          width={32}
                          height={32}
                          className="rounded-full flex-shrink-0"
                          unoptimized={true}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                          <Coins className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium">{token.symbol}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {token.name}
                        </span>
                        {token.address !== '0x0000000000000000000000000000000000000000' && (
                          <span className="text-xs text-muted-foreground truncate font-mono">
                            {token.address.slice(0, 6)}...{token.address.slice(-4)}
                          </span>
                        )}
                      </div>
                      {selectedToken?.address.toLowerCase() === token.address.toLowerCase() && (
                        <Check className="h-4 w-4 flex-shrink-0" />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </div>
        </Command>
        {selectedToken && (
          <div className="border-t p-3 bg-muted/50">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Decimals:</span>
                <span className="font-medium">{selectedToken.decimals}</span>
              </div>
              {selectedToken.address !== '0x0000000000000000000000000000000000000000' && (
                <div className="flex justify-between items-center gap-2">
                  <span>Address:</span>
                  <span className="font-mono text-xs truncate max-w-[250px]">
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

