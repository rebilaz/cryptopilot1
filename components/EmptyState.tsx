import React from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: string;
};

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="border border-white/10 bg-white/5 rounded-xl p-10 text-center flex flex-col items-center gap-4">
      <div className="text-lg font-semibold">{title}</div>
      {description && <div className="text-sm text-white/70">{description}</div>}
      {action && (
        <button
          type="button"
          disabled
          className="mt-2 rounded-lg px-6 py-2 bg-indigo-600/40 text-white/70 font-semibold cursor-not-allowed opacity-60"
        >
          {action}
        </button>
      )}
    </div>
  );
}
