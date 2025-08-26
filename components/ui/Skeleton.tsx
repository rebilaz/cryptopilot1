"use client";
import React from 'react';

export function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-700/40 rounded ${className}`} />;
}

export function HeaderSkeleton() {
  return (
    <div className="rounded-2xl p-6 bg-slate-800/50 border border-slate-700/50">
      <div className="flex items-center gap-4 mb-4">
        <SkeletonBar className="w-14 h-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBar className="h-4 w-40" />
          <SkeletonBar className="h-3 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_,i)=>(<SkeletonBar key={i} className="h-14" />))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded-2xl p-4 bg-slate-800/40 border border-slate-700/50 space-y-2">
      {Array.from({ length: rows }).map((_,i)=>(<SkeletonBar key={i} className="h-6" />))}
    </div>
  );
}
