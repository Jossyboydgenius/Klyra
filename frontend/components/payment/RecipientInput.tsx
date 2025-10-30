'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Check, AlertCircle } from 'lucide-react';
import { isAddress } from 'viem';
import { normalize } from 'viem/ens';
import { useEnsAddress, useEnsName } from 'wagmi';

interface RecipientInputProps {
  value: string;
  onChange: (address: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function RecipientInput({
  value,
  onChange,
  label = 'Recipient Address',
  placeholder = '0x... or ENS/basename',
  className,
}: RecipientInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [originalENSName, setOriginalENSName] = useState<string | null>(null);

  // Check if input is an address
  const isValidAddress = value && isAddress(value);
  
  // Check if input looks like an ENS name (.eth, .base, etc) or multi-chain format
  const isENSName = value && (
    value.endsWith('.eth') || 
    value.endsWith('.base') || 
    value.endsWith('.xyz') ||
    value.endsWith('.com') ||
    value.includes(':') // Multi-chain format: vitalik.eth:btc
  );

  // Resolve ENS to address
  const { data: ensAddress, isLoading: isResolvingENS, error: ensError } = useEnsAddress({
    name: isENSName ? normalize(value) : undefined,
    chainId: 1, // ENS is on mainnet
  });

  // Resolve address to ENS (for display)
  const { data: ensName } = useEnsName({
    address: isValidAddress ? value as `0x${string}` : undefined,
    chainId: 1,
  });

  // Auto-resolve ENS to address
  useEffect(() => {
    if (ensAddress && isENSName) {
      // Store the original ENS name before changing to address
      setOriginalENSName(value);
      onChange(ensAddress);
      setError(null);
    } else if (ensError && isENSName) {
      setError('Could not resolve ENS name');
    } else if (value && !isValidAddress && !isENSName) {
      setError('Invalid address or ENS name');
    } else {
      setError(null);
    }
  }, [ensAddress, ensError, isENSName, value, isValidAddress, onChange]);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);
    // Clear original ENS name when user manually changes input
    if (newValue !== value) {
      setOriginalENSName(null);
    }
  };

  return (
    <div className={className}>
      <Label className="flex items-center gap-2 mb-2">
        <User className="h-4 w-4" />
        {label}
      </Label>
      
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className={`pr-10 ${
            isValidAddress || ensAddress ? 'border-green-500' : 
            error ? 'border-red-500' : ''
          }`}
        />
        
        {/* Status indicator */}
        {value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isResolvingENS ? (
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            ) : isValidAddress || ensAddress ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : error ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : null}
          </div>
        )}
      </div>

      {/* Display resolved ENS name for addresses */}
      {isValidAddress && (ensName || originalENSName) && (
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            ✓ {originalENSName || ensName}
          </Badge>
          <span className="text-xs text-muted-foreground">→</span>
          <Badge variant="outline" className="text-xs font-mono">
            {value}
          </Badge>
        </div>
      )}

      {/* Display loading state */}
      {isResolvingENS && (
        <p className="text-sm text-blue-600 mt-1">
          Resolving ENS name...
        </p>
      )}

      {/* Display errors */}
      {error && (
        <p className="text-sm text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

