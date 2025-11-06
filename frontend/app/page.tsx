/* eslint-disable @typescript-eslint/no-unused-vars*/
/* eslint-disable @typescript-eslint/no-explicit-any*/

'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../lib/supabase/info';
import { OnboardingFlow } from '../components/OnboardingFlow';
import { AuthScreen } from '../components/AuthScreen';
import { SplashScreen } from '../components/SplashScreen';
// import KYCScreen from '../components/KYCScreen';
import { Dashboard } from '../components/Dashboard';
import { PaymentMethods } from '../components/PaymentMethods';
import BuyCrypto from '../components/BuyCrypto';
import { SellCrypto } from '../components/SellCrypto';
import { SendCrypto } from '../components/SendCrypto';
import { CryptoWallet } from '../components/CryptoWallet';
import { AssetDetails } from '../components/AssetDetails';
import { ProcessingScreen } from '../components/ProcessingScreen';
import { NetworkTokenAdder } from '../components/NetworkTokenAdder';
import { Button } from '../components/ui/button';
import { ArrowLeft, User, LogOut, ChevronDown, Wallet, Settings } from 'lucide-react';
import { useAccount, useDisconnect } from 'wagmi';

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
  const [isLoading, setIsLoading] = useState(true);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const { disconnect } = useDisconnect();

  const checkExistingSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
        await loadUserData(session.access_token);
      } else {
        setCurrentScreen('onboarding');
      }
    } catch (error) {
      console.log('Session check error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const loadUserData = async (token: string) => {
    try {
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

        if (data.profile.kyc_status === 'pending') {
          setCurrentScreen('kyc');
        } else {
          setCurrentScreen('dashboard');
        }
      } else {
        console.log('Failed to load user data');
        setCurrentScreen('auth');
      }
    } catch (error) {
      console.log('Error loading user data:', error);
      setCurrentScreen('auth');
    }
  };

  const handleAuth = async (token: string) => {
    setAccessToken(token);
    await loadUserData(token);
  };

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

  const refreshUserData = async () => {
    if (accessToken) {
      await loadUserData(accessToken);
    }
  };

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
      'add-network-token': 'Add Network/Token'
    };
    return titles[currentScreen] || 'Paymaster';
  };

  const renderHeader = () => {
    if (currentScreen === 'onboarding' || currentScreen === 'auth') return null;

    return (
      <header className="sticky top-0 z-50 bg-linear-to-r from-indigo-600 via-purple-600 to-indigo-600 border-b border-indigo-400/30 backdrop-blur-md shadow-lg">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentScreen !== 'dashboard' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentScreen('dashboard')}
                className="p-2 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
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
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-white truncate max-w-[120px]">
                    {user.name || user.email.split('@')[0]}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-white transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
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
      <div className="min-h-screen bg-linear-to-br from-indigo-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container">
      {/* Splash Screen */}
      {currentScreen === 'splash' && (
        <SplashScreen onComplete={() => setCurrentScreen('onboarding')} />
      )}

      {/* Main App Content */}
      {currentScreen !== 'splash' && (
        <>
          {renderHeader()}

          <div className="flex-1 min-h-0">
            {currentScreen === 'onboarding' && (
              <OnboardingFlow onComplete={() => setCurrentScreen('auth')} />
            )}

            {currentScreen === 'auth' && (
              <AuthScreen onAuthSuccess={handleAuth} />
            )}

            {/* {currentScreen === 'kyc' && user && (
              <KYCScreen
                email={user.email}
                countryCode="NG"
                onComplete={handleKYCComplete}
              />
            )} */}

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

            {currentScreen === 'buy' && (
              <BuyCrypto />
            )}

            {currentScreen === 'sell' && balances && (
              <SellCrypto
                accessToken={accessToken!}
                balances={balances}
                onTransactionStart={(txId: string) => {
                  setTransactionId(txId);
                  setCurrentScreen('processing');
                }}
                onBack={() => setCurrentScreen('dashboard')}
              />
            )}

            {currentScreen === 'send' && balances && (
              <SendCrypto
                accessToken={accessToken!}
                balances={balances}
                onSuccess={() => {
                  refreshUserData();
                  setCurrentScreen('wallet');
                }}
                onBack={() => setCurrentScreen('dashboard')}
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
          </div>
        </>
      )}
    </div>
  );
};

export default App;