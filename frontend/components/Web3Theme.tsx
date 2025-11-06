'use client';
import React from 'react';

interface Web3ThemeProviderProps {
  children: React.ReactNode;
}

export const Web3ThemeProvider: React.FC<Web3ThemeProviderProps> = ({ children }) => {
  return (
    <div className="web3-app-theme">
      {children}
    </div>
  );
};

// Universal Web3 Container Component
interface Web3ContainerProps {
  children: React.ReactNode;
  className?: string;
  withPadding?: boolean;
}

export const Web3Container: React.FC<Web3ContainerProps> = ({ 
  children, 
  className = '', 
  withPadding = true 
}) => {
  return (
    <div className={`min-h-screen w-full bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 ${withPadding ? 'px-6 py-8' : ''} ${className}`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-linear-to-r from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-linear-to-r from-purple-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-linear-to-r from-violet-400/10 to-purple-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

// Universal Web3 Card Component
interface Web3CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Web3Card: React.FC<Web3CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`bg-linear-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl p-6 border border-white/10 shadow-2xl ${className}`} {...props}>
      {children}
    </div>
  );
};

// Universal Web3 Button Component
interface Web3ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  disabled?: boolean;
  icon?: boolean;
}

export const Web3Button: React.FC<Web3ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false,
  icon = false,
  ...props
}) => {
  const baseClasses = `${icon ? 'h-12 w-12' : 'h-12 px-6'} rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-2`;
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-cyan-400 to-violet-500 hover:from-cyan-300 hover:to-violet-400 text-white shadow-xl shadow-cyan-500/25 border-0",
    secondary: "text-white hover:bg-white/10 border border-white/20 backdrop-blur-xl",
    ghost: "text-gray-300 hover:bg-white/5 border border-white/10 backdrop-blur-xl"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
