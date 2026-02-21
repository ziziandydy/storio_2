'use client';
import React from 'react';
import Image from 'next/image';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="relative w-48 h-48">
        <Image 
          src="/image/loading.gif" 
          alt="Loading..." 
          fill
          className="object-contain"
          unoptimized
          priority
        />
      </div>
    </div>
  );
}
