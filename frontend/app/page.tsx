/* eslint-disable @typescript-eslint/no-unused-vars*/
/* eslint-disable @typescript-eslint/no-explicit-any*/

'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../lib/supabase/info';
import { OnboardingFlow } from '../components/OnboardingFlow';
import { AuthScreen } from '../components/AuthScreen';
import { SplashScreen } from '../components/SplashScreen';
import { KYCScreen } from '../components/KYCScreen';
import { Dashboard } from '../components/Dashboard';
import { PaymentMethods } from '../components/PaymentMethods';
import BuyCrypto from '../components/BuyCrypto';
import { SellCrypto } from '../components/SellCrypto';
import { SendCrypto } from '../components/SendCrypto';
import { CryptoWallet } from '../components/CryptoWallet';
import { AssetDetails } from '../components/AssetDetails';
import { ProcessingScreen } from '../components/ProcessingScreen';
import { NetworkTokenAdder } from '../components/NetworkTokenAdder';
import { TransactionsList } from '../components/TransactionsList';
import { TransactionDetails } from '../components/TransactionDetails';
import { Button } from '../components/ui/button';
import { Web3Container, Web3Card } from '../components/Web3Theme';
import { ArrowLeft, User, LogOut, ChevronDown, Wallet, Settings } from 'lucide-react';
import { useAccount, useDisconnect } from 'wagmi';
import { Transaction } from '@/lib/database/supabase-client';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  kyc_status: string;
}

interface Balances {
  crypto: {
    [key: string]: {
      amount: number;
      networks: { [network: string]: number };
    };
  };
}

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<string>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const { disconnect } = useDisconnect();

  const loadUserData = useCallback(async (token: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/${process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_NAME}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.profile);
        setBalances(data.balances);
        setPaymentMethods(data.paymentMethods || []);

        // Set screen based on KYC status
        if (data.profile.kyc_status === 'pending' || data.profile.kyc_status === null || data.profile.kyc_status === undefined) {
          setCurrentScreen('kyc');
        } else {
          setCurrentScreen('dashboard');
        }
      } else {
        console.error('Failed to load user data:', response.status, response.statusText);
        setCurrentScreen('auth');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setCurrentScreen('auth');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkExistingSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session check error:', error);
        setCurrentScreen('onboarding');
        setIsLoading(false);
        return;
      }
      
      if (session?.access_token) {
        setAccessToken(session.access_token);
        await loadUserData(session.access_token);
      } else {
        setCurrentScreen('onboarding');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setCurrentScreen('onboarding');
      setIsLoading(false);
    }
  }, [loadUserData]);

  useEffect(() => {
    checkExistingSession();
  }, [checkExistingSession]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserDropdown && userDropdownRef.current) {
        const target = event.target as HTMLElement;
        // Check if click is outside the dropdown container
        if (!userDropdownRef.current.contains(target)) {
          setShowUserDropdown(false);
        }
      }
    };
    
    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);


  const handleAuth = useCallback(async (token: string) => {
    setAccessToken(token);
    await loadUserData(token);
  }, [loadUserData]);

  const handleKYCComplete = () => {
    setCurrentScreen('dashboard');
    if (user) {
      setUser({ ...user, kyc_status: 'verified' });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setBalances(null);
    setPaymentMethods([]);
    setAccessToken(null);
    setCurrentScreen('onboarding');
  };

  const refreshUserData = useCallback(async () => {
    if (accessToken) {
      await loadUserData(accessToken);
    }
  }, [accessToken, loadUserData]);

  const getScreenTitle = () => {
    const titles: { [key: string]: string } = {
      'dashboard': 'Paymaster',
      'kyc': 'Identity Verification',
      'payment-methods': 'Payment Methods',
      'buy': 'Buy Crypto',
      'sell': 'Sell Crypto',
      'send': 'Send Crypto',
      'wallet': 'Crypto Wallet',
      'asset-details': 'Asset Details',
      'processing': 'Processing Transaction',
      'add-network-token': 'Add Network/Token',
      'transactions': 'Transactions',
      'transaction-details': 'Transaction Details'
    };
    return titles[currentScreen] || 'Paymaster';
  };

  const renderHeader = () => {
    if (currentScreen === 'onboarding' || currentScreen === 'auth') return null;

    return (
      <header className="sticky top-0 z-50 bg-linear-to-r from-indigo-600 via-purple-600 to-indigo-600 border-b border-indigo-400/30 backdrop-blur-md shadow-lg">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentScreen !== 'dashboard' && currentScreen !== 'kyc' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentScreen('dashboard')}
                className="p-2 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            {currentScreen === 'kyc' && (
              <div className="text-xs text-indigo-200/60 bg-yellow-500/20 border border-yellow-400/30 rounded px-3 py-1">
                Verification Required
              </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-white">
                {getScreenTitle()}
              </h1>
              {user && (
                <p className="text-xs text-indigo-200/80 truncate max-w-[200px]">
                  {/* {user.email} */}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="hidden items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm transition-colors hover:bg-white/20 sm:flex"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="max-w-[120px] truncate text-sm font-medium text-white">
                    {user.name || user.email.split('@')[0]}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-white transition-transform ${showUserDropdown ? 'rotate-180' : ''}`}
                  />
                </button>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 sm:hidden"
                  aria-label="User menu"
                >
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`}
                  />
                </button>
                
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        // Navigate to profile (you can implement this)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        disconnect();
                        setShowUserDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      Disconnect Wallet
                    </button>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        handleLogout();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
            {!user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="p-2 hover:bg-white/20 text-white rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </header>
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-indigo-950 via-purple-950/40 to-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-400"></div>
          <p className="text-sm font-medium text-indigo-100">
            Loading your Klyra experience...
          </p>
        </div>
      </div>
    );
  }

  const constrainedScreens = new Set([
    'dashboard',
    'payment-methods',
    'buy',
    'sell',
    'send',
    'wallet',
    'asset-details',
    'processing',
    'add-network-token',
    'transactions',
    'transaction-details',
  ]);

  const contentWrapperClass = constrainedScreens.has(currentScreen)
    ? 'mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8'
    : 'h-full w-full';

  return (
    <div className="mobile-container flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {currentScreen === 'splash' ? (
        <SplashScreen onComplete={() => setCurrentScreen('onboarding')} />
      ) : (
        <>
          {renderHeader()}
          <main className="flex-1 overflow-y-auto bg-linear-to-b from-slate-950 via-slate-950/80 to-slate-950 pb-safe">
            <div className={contentWrapperClass}>
              {currentScreen === 'onboarding' && (
                <OnboardingFlow onComplete={() => setCurrentScreen('auth')} />
              )}

              {currentScreen === 'auth' && (
                <AuthScreen onAuthSuccess={handleAuth} />
              )}

              {currentScreen === 'kyc' && (
                accessToken ? (
                  <KYCScreen
                    accessToken={accessToken}
                    onComplete={async () => {
                      // Reload user data to get updated KYC status
                      if (accessToken) {
                        await loadUserData(accessToken);
                      } else {
                        handleKYCComplete();
                      }
                    }}
                  />
                ) : (
                  <Web3Container>
                    <div className="min-h-[60vh] flex items-center justify-center">
                      <Web3Card className="max-w-md w-full text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
                        <p className="text-indigo-200/80">Loading verification...</p>
                      </Web3Card>
                    </div>
                  </Web3Container>
                )
              )}

              {currentScreen === 'dashboard' && user && balances && (
                <Dashboard
                  user={user}
                  balances={balances}
                  paymentMethods={paymentMethods}
                  onNavigate={setCurrentScreen}
                  onRefresh={refreshUserData}
                />
              )}

              {currentScreen === 'payment-methods' && (
                <PaymentMethods
                  accessToken={accessToken!}
                  onRefreshAction={refreshUserData}
                />
              )}

              {currentScreen === 'buy' && <BuyCrypto />}

              {currentScreen === 'sell' && balances && (
                <SellCrypto
                  accessToken={accessToken!}
                  balances={balances}
                  paymentMethods={paymentMethods}
                  onTransactionStart={(txId: string) => {
                    setTransactionId(txId);
                    setCurrentScreen('processing');
                  }}
                  onBack={() => setCurrentScreen('dashboard')}
                  onNavigate={setCurrentScreen}
                />
              )}

              {currentScreen === 'send' && balances && (
                <SendCrypto
                  accessToken={accessToken!}
                  balances={balances}
                  paymentMethods={paymentMethods}
                  onSuccess={() => {
                    refreshUserData();
                    setCurrentScreen('wallet');
                  }}
                  onBack={() => setCurrentScreen('dashboard')}
                  onNavigate={setCurrentScreen}
                />
              )}

              {currentScreen === 'wallet' && balances && (
                <CryptoWallet
                  balances={balances}
                  onAssetSelectAction={(asset: string) => {
                    setSelectedAsset(asset);
                    setCurrentScreen('asset-details');
                  }}
                />
              )}

              {currentScreen === 'asset-details' && selectedAsset && balances && (
                <AssetDetails
                  asset={selectedAsset}
                  balance={balances.crypto[selectedAsset]}
                  onBack={() => setCurrentScreen('wallet')}
                />
              )}

              {currentScreen === 'processing' && transactionId && (
                <ProcessingScreen
                  transactionId={transactionId}
                  accessToken={accessToken!}
                  onComplete={() => {
                    refreshUserData();
                    setCurrentScreen('wallet');
                  }}
                />
              )}

              {currentScreen === 'add-network-token' && (
                <NetworkTokenAdder
                  onBack={() => setCurrentScreen('dashboard')}
                />
              )}

              {currentScreen === 'transactions' && (
                <TransactionsList
                  onSelectTransaction={(transaction) => {
                    setSelectedTransaction(transaction);
                    setCurrentScreen('transaction-details');
                  }}
                />
              )}

              {currentScreen === 'transaction-details' &&
                (selectedTransaction?.id || transactionId) && (
                  <TransactionDetails
                    transactionId={selectedTransaction?.id || transactionId || ''}
                    onBack={() => {
                      setSelectedTransaction(null);
                      setCurrentScreen('transactions');
                    }}
                  />
                )}
            </div>
          </main>
        </>
      )}
    </div>
  );
};

export default App;