'use client';
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowRight, Wallet, CreditCard, Smartphone, Globe, Shield, Zap } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const onboardingSteps = [
  {
    icon: Wallet,
    title: 'One App, All Your Money',
    description: 'Connect your banks, mobile money, credit cards, and crypto wallets in one secure place.',
    color: 'bg-blue-100 text-blue-600'
  },
  {
    icon: Globe,
    title: 'Universal Crypto Wallet',
    description: 'Your crypto works across all networks. $10 ETH on Ethereum = $10 ETH equivalent on Base and other networks.',
    color: 'bg-purple-100 text-purple-600'
  },
  {
    icon: Zap,
    title: 'Instant Conversions',
    description: 'Buy crypto with mobile money or bank transfers. Sell crypto directly to your traditional accounts.',
    color: 'bg-green-100 text-green-600'
  },
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description: 'Your financial data is protected with enterprise-grade security and encryption.',
    color: 'bg-orange-100 text-orange-600'
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

  const skip = () => {
    onComplete();
  };

  const currentStepData = onboardingSteps[currentStep];
  const IconComponent = currentStepData.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-white">Paymaster</h1>
          <p className="text-blue-100 text-sm">Bridging Traditional Finance & Web3</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="bg-white p-6 mb-6">
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full ${currentStepData.color} flex items-center justify-center mx-auto mb-4`}>
              <IconComponent className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {currentStepData.title}
            </h2>
            <p className="text-gray-600 leading-relaxed">
              {currentStepData.description}
            </p>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={skip}
            className="text-white hover:bg-white/10 flex-1"
          >
            Skip
          </Button>
          <Button
            onClick={nextStep}
            className="bg-white text-blue-600 hover:bg-gray-100 flex-1 flex items-center justify-center gap-2"
          >
            {currentStep < onboardingSteps.length - 1 ? 'Next' : 'Get Started'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="text-white/80">
            <CreditCard className="w-6 h-6 mx-auto mb-2" />
            <p className="text-xs">Traditional Finance</p>
          </div>
          <div className="text-white/80">
            <Smartphone className="w-6 h-6 mx-auto mb-2" />
            <p className="text-xs">Mobile Money</p>
          </div>
          <div className="text-white/80">
            <Wallet className="w-6 h-6 mx-auto mb-2" />
            <p className="text-xs">Crypto Wallets</p>
          </div>
        </div>
      </div>
    </div>
  );
};