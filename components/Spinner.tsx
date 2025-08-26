"use client";
import React from 'react';

export const Spinner: React.FC<{ size?: number; className?: string; label?: string }> = ({ size = 24, className = '', label }) => {
  return (
    <div className={`inline-flex flex-col items-center justify-center gap-2 ${className}`}>      
      <span
        className="animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900"
        style={{ width: size, height: size }}
        aria-label={label || 'Chargement'}
        role="status"
      />
      {label && <span className="text-[11px] text-neutral-500">{label}</span>}
    </div>
  );
};

export default Spinner;
