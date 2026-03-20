'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FeatureGuideCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function FeatureGuideCard({ icon: Icon, title, description }: FeatureGuideCardProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center select-none">
      {/* Icon Circle */}
      <div className="mb-8 flex items-center justify-center w-24 h-24 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30">
        <Icon size={40} className="text-[#c5a059]" strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-semibold text-white mb-4 leading-snug">
        {title}
      </h2>

      {/* Description */}
      <p className="text-base text-white/60 leading-relaxed max-w-xs">
        {description}
      </p>
    </div>
  );
}
