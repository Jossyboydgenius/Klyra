'use client';
import React from 'react';

interface MobileLoaderProps {
  message?: string;
}

export const MobileLoader: React.FC<MobileLoaderProps> = ({ 
  message = "Loading..." 
}) => {
  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        {/* Animated Logo Loader */}
        <div className="relative mb-6">
          <div className="w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <div className="w-6 h-6 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
        
        {/* Loading Text */}
        <p className="text-gray-600 font-medium">{message}</p>
        
        {/* Animated Dots */}
        <div className="flex justify-center space-x-1 mt-4">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    </div>
  );
};
