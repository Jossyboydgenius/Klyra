/* eslint-disable @typescript-eslint/no-unused-vars*/
/* eslint-disable @typescript-eslint/no-explicit-any*/

'use client';
import React, { useState, useEffect, useCallback } from 'react';
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
import { Button } from '../components/ui/button';
import { ArrowLeft, User } from 'lucide-react';


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


  const renderHeader = () => {
    if (currentScreen === 'onboarding' || currentScreen === 'auth') return null;


    return (
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentScreen !== 'dashboard' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen('dashboard')}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="text-lg font-semibold text-gray-900">
            {currentScreen === 'dashboard' && 'Paymaster'}
            {currentScreen === 'kyc' && 'Identity Verification'}
            {currentScreen === 'payment-methods' && 'Payment Methods'}
            {currentScreen === 'buy' && 'Buy Crypto'}
            {currentScreen === 'sell' && 'Sell Crypto'}
            {currentScreen === 'send' && 'Send Crypto'}
            {currentScreen === 'wallet' && 'Crypto Wallet'}
            {currentScreen === 'asset-details' && 'Asset Details'}
            {currentScreen === 'processing' && 'Processing Transaction'}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleLogout} className="p-2">
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
        )}        {currentScreen === 'asset-details' && selectedAsset && balances && (
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
          </div>
        </>
      )}
    </div>
  );
};
export default App;