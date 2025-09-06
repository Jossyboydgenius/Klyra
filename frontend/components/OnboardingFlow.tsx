'use client';
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Wallet, CreditCard, Smartphone, Globe, Shield, Zap, ChevronLeft, ChevronRight } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const onboardingSteps = [
  {
    icon: Wallet,
    title: 'One App, All Your Money',
    description: 'Connect your banks, mobile money, credit cards, and crypto wallets in one secure place.',
    color: 'bg-gradient-to-br from-cyan-400 to-blue-500'
  },
  {
    icon: Globe,
    title: 'Universal Crypto Wallet',
    description: 'Your crypto works across all networks. Seamless multi-chain experience with automatic bridging.',
    color: 'bg-gradient-to-br from-violet-500 to-purple-600'
  },
  {
    icon: Zap,
    title: 'Instant Conversions',
    description: 'Buy crypto with mobile money or bank transfers. Sell crypto directly to your traditional accounts.',
    color: 'bg-gradient-to-br from-emerald-400 to-cyan-500'
  },
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description: 'Your financial data is protected with enterprise-grade security and encryption.',
    color: 'bg-gradient-to-br from-pink-400 to-rose-500'
  }
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skip = () => {
    onComplete();
  };

  const currentStepData = onboardingSteps[currentStep];
  const IconComponent = currentStepData.icon;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col overflow-x-hidden overflow-y-auto smooth-transition">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-violet-400/10 to-purple-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex-shrink-0 pt-16 pb-8 px-6">
          <div className="text-center">
            <div className="bg-gradient-to-r from-cyan-400/20 to-violet-500/20 backdrop-blur-xl rounded-3xl w-24 h-24 flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-2xl">
              <Wallet className="w-12 h-12 text-white drop-shadow-lg" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Klyra</h1>
            <p className="text-gray-300 text-lg">Your Web3 Super App</p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex-shrink-0 px-6 mb-8">
          <div className="flex justify-center">
            <div className="flex space-x-3">
              {onboardingSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    index <= currentStep 
                      ? 'bg-gradient-to-r from-cyan-400 to-violet-500 w-10 shadow-lg shadow-cyan-500/50' 
                      : 'bg-white/20 w-2'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 px-6 pb-6">
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 h-full flex flex-col justify-center shadow-2xl">
            <div className="text-center">
              <div className={`w-28 h-28 rounded-3xl ${currentStepData.color} flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-cyan-500/25 border border-white/20`}>
                <IconComponent className="w-14 h-14 text-white drop-shadow-lg" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-6 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                {currentStepData.title}
              </h2>
              <p className="text-gray-200 text-lg leading-relaxed max-w-sm mx-auto">
                {currentStepData.description}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-shrink-0 px-6 pb-safe pb-8">
          <div className="flex gap-3 mb-6">
            {currentStep > 0 && (
              <Button
                variant="ghost"
                onClick={prevStep}
                className="text-white hover:bg-white/10 border border-white/20 backdrop-blur-xl flex items-center gap-2 h-12 px-6 rounded-2xl transition-all duration-300"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={skip}
              className="text-gray-300 hover:bg-white/5 border border-white/10 backdrop-blur-xl h-12 px-6 rounded-2xl transition-all duration-300"
            >
              Skip
            </Button>
            <Button
              onClick={nextStep}
              className="bg-gradient-to-r from-cyan-400 to-violet-500 hover:from-cyan-300 hover:to-violet-400 text-white flex-1 flex items-center justify-center gap-2 font-semibold h-12 rounded-2xl shadow-xl shadow-cyan-500/25 transition-all duration-300 border-0"
            >
              {currentStep < onboardingSteps.length - 1 ? 'Next' : 'Get Started'}
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-xl">
              <CreditCard className="w-8 h-8 mx-auto mb-2 text-cyan-300 drop-shadow-lg" />
              <p className="text-gray-200 text-sm font-medium">Banking</p>
            </div>
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-xl">
              <Smartphone className="w-8 h-8 mx-auto mb-2 text-violet-300 drop-shadow-lg" />
              <p className="text-gray-200 text-sm font-medium">Mobile Money</p>
            </div>
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-xl">
              <Globe className="w-8 h-8 mx-auto mb-2 text-pink-300 drop-shadow-lg" />
              <p className="text-gray-200 text-sm font-medium">DeFi</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};