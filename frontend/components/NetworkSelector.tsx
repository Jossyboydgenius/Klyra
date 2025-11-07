/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import Image from 'next/image';
import React, { useState, useMemo } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAllChains,
  getMainnetChains,
  getTestnetChains,
  searchChains,
  type Chain,
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNetwork } from '@/contexts/NetworkContext';
import { getChainLogo } from '@/lib/chain-logos';

interface NetworkSelectorProps {
  value?: number | null; // Chain ID
  onChange: (chainId: number, chain: Chain) => void;
  className?: string;
  placeholder?: string;
  includeTestnets?: boolean;
  disabled?: boolean;
  filterChainIds?: number[]; // Optional: only show specific chains
  customChains?: Chain[]; // Optional: provide custom chain list (e.g., from chainid.network)
}

export function NetworkSelector({
  value,
  onChange,
  className,
  placeholder = 'Select network',
  includeTestnets = true,
  disabled = false,
  filterChainIds,
  customChains,
}: NetworkSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [networkType, setNetworkType] = useState<'mainnet' | 'testnet'>('mainnet');

  // Get all chains and filter if needed (with deduplication)
  const allChains = useMemo(() => {
    // Use custom chains if provided, otherwise use default
    let chains = customChains || getAllChains();
    if (filterChainIds && filterChainIds.length > 0) {
      chains = chains.filter(chain => filterChainIds.includes(chain.id));
    }
    
    // Extra safety: deduplicate by chain ID to prevent duplicate keys
    const uniqueChains = new Map<number, Chain>();
    chains.forEach(chain => {
      if (!uniqueChains.has(chain.id)) {
        uniqueChains.set(chain.id, chain);
      }
    });
    
    return Array.from(uniqueChains.values());
  }, [filterChainIds, customChains]);

  const mainnetChains = useMemo(() => {
    // Filter from allChains (which already uses customChains if provided)
    const chains = allChains.filter(chain => 
      (!chain.testnet) && (!filterChainIds || filterChainIds.includes(chain.id))
    );
    
    // Deduplicate by chain ID
    const uniqueChains = new Map<number, Chain>();
    chains.forEach(chain => {
      if (!uniqueChains.has(chain.id)) {
        uniqueChains.set(chain.id, chain);
      }
    });
    
    return Array.from(uniqueChains.values());
  }, [allChains, filterChainIds]);

  const testnetChains = useMemo(() => {
    // Filter from allChains (which already uses customChains if provided)
    const chains = allChains.filter(chain => 
      (chain.testnet) && (!filterChainIds || filterChainIds.includes(chain.id))
    );
    
    // Deduplicate by chain ID
    const uniqueChains = new Map<number, Chain>();
    chains.forEach(chain => {
      if (!uniqueChains.has(chain.id)) {
        uniqueChains.set(chain.id, chain);
      }
    });
    
    return Array.from(uniqueChains.values());
  }, [allChains, filterChainIds]);

  // Filter chains based on search and network type
  const filteredChains = useMemo(() => {
    let chains = networkType === 'mainnet' ? mainnetChains : testnetChains;
    
    if (searchQuery.trim()) {
      const searched = searchChains(searchQuery, networkType === 'testnet');
      chains = chains.filter(chain => searched.some(s => s.id === chain.id));
    }
    
    return chains;
  }, [mainnetChains, testnetChains, searchQuery, networkType]);

  // Get selected chain
  const selectedChain = useMemo(() => {
    return value ? allChains.find(chain => chain.id === value) : null;
  }, [value, allChains]);

  const { setSelectedChain } = useNetwork();

  const handleSelect = (chain: Chain) => {
    onChange(chain.id, chain);
    setSelectedChain(chain); // Update global network context
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between',
            !selectedChain && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedChain ? (
              <>
                {(() => {
                  const chainLogo = getChainLogo(selectedChain.id);
                  return chainLogo ? (
                    <div className="relative shrink-0">
                      <Image
                        src={chainLogo}
                        alt={selectedChain.name}
                        unoptimized={true}
                        width={20}
                        height={20}
                        className="w-5 h-5 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      selectedChain.testnet ? "bg-orange-500" : "bg-green-500"
                    )} />
                  );
                })()}
                <span className="truncate">{selectedChain.name}</span>
                {selectedChain.testnet && (
                  <span className="text-xs text-muted-foreground shrink-0">(Testnet)</span>
                )}
              </>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-2 border-b">
          {includeTestnets && (
            <Tabs 
              value={networkType} 
              onValueChange={(v) => {
                // Prevent infinite loops by only updating if value actually changed
                if (v !== networkType) {
                  setNetworkType(v as 'mainnet' | 'testnet');
                }
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="mainnet">Mainnet</TabsTrigger>
                <TabsTrigger value="testnet">Testnet</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Search networks..."
              value={searchQuery}
              onChange={(e) => {
                // Prevent infinite loops by only updating if value actually changed
                const newValue = e.target.value;
                if (newValue !== searchQuery) {
                  setSearchQuery(newValue);
                }
              }}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-black disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {filteredChains.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No networks found.
              </div>
            ) : (
              <CommandGroup>
                {filteredChains.map((chain) => (
                  <CommandItem
                    key={chain.id}
                    value={`${chain.id}-${chain.name}`}
                    onSelect={() => handleSelect(chain)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {(() => {
                        const chainLogo = getChainLogo(chain.id);
                        return chainLogo ? (
                          <div className="relative shrink-0">
                            <Image
                              src={chainLogo}
                              alt={chain.name}
                              unoptimized={true}
                              width={24}
                              height={24}
                              className="w-6 h-6 rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            chain.testnet ? "bg-orange-500" : "bg-green-500"
                          )} />
                        );
                      })()}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium truncate">{chain.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          Chain ID: {chain.id} • {chain.nativeCurrency.symbol}
                        </span>
                      </div>
                      {selectedChain?.id === chain.id && (
                        <Check className="h-4 w-4 shrink-0" />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Simplified version without dropdown - just for display
interface NetworkBadgeProps {
  chainId: number;
  className?: string;
}

export function NetworkBadge({ chainId, className }: NetworkBadgeProps) {
  const allChains = getAllChains();
  const chain = allChains.find(c => c.id === chainId);

  if (!chain) {
    return <span className={cn('text-sm text-muted-foreground', className)}>Unknown Network</span>;
  }

  return (
    <div className={cn('inline-flex items-center gap-2 px-2 py-1 rounded-md bg-secondary text-secondary-foreground', className)}>
      <div className={cn(
        "w-2 h-2 rounded-full",
        chain.testnet ? "bg-orange-500" : "bg-green-500"
      )} />
      <span className="text-sm font-medium">{chain.name}</span>
      {chain.testnet && (
        <span className="text-xs text-muted-foreground">(Testnet)</span>
      )}
    </div>
  );
}

