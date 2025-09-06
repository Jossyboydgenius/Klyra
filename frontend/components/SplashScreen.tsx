'use client';
import React, { useEffect, useState } from 'react';
import { Wallet, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300); // Allow fade out animation
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center z-50 transition-opacity duration-300 opacity-0 pointer-events-none overflow-hidden">
      </div>
    );
  }

  return (
    <div className="fixed inset-0 min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center z-50 overflow-x-hidden overflow-y-auto">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-cyan-400/30 to-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/30 to-pink-500/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-violet-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="text-center relative z-10">
        {/* Animated Logo */}
        <div className="relative mb-8">
          <div className="bg-gradient-to-r from-cyan-400/20 to-violet-500/20 backdrop-blur-xl rounded-full w-40 h-40 flex items-center justify-center mx-auto border border-white/10 shadow-2xl">
            <Wallet className="w-20 h-20 text-white drop-shadow-2xl" />
          </div>
          
          {/* Floating sparkles */}
          <div className="absolute -top-4 -right-4 animate-bounce">
            <Sparkles className="w-8 h-8 text-cyan-300 drop-shadow-lg" />
          </div>
          <div className="absolute -bottom-4 -left-4 animate-bounce delay-300">
            <Sparkles className="w-6 h-6 text-pink-300 drop-shadow-lg" />
          </div>
          <div className="absolute top-1/2 -right-6 animate-bounce delay-500">
            <Sparkles className="w-7 h-7 text-violet-300 drop-shadow-lg" />
          </div>
        </div>

        {/* App Name */}
        <h1 className="text-6xl font-bold text-white mb-4 tracking-tight bg-gradient-to-r from-white via-cyan-200 to-violet-200 bg-clip-text text-transparent drop-shadow-2xl">
          Klyra
        </h1>
        
        {/* Tagline */}
        <p className="text-gray-200 text-2xl font-medium mb-12">
          Your Web3 Super App
        </p>

        {/* Loading Animation */}
        <div className="flex justify-center space-x-3">
          <div className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-bounce shadow-lg shadow-cyan-500/50"></div>
          <div className="w-4 h-4 bg-gradient-to-r from-violet-400 to-purple-500 rounded-full animate-bounce delay-100 shadow-lg shadow-violet-500/50"></div>
          <div className="w-4 h-4 bg-gradient-to-r from-pink-400 to-rose-500 rounded-full animate-bounce delay-200 shadow-lg shadow-pink-500/50"></div>
        </div>
      </div>
    </div>
  );
};
