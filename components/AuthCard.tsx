import React from "react";

type AuthCardProps = {
  title: string;
  children: React.ReactNode;
};

export default function AuthCard({ title, children }: AuthCardProps) {
  return (
    <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 mt-12 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-center mb-4">{title}</h1>
      {children}
    </div>
  );
}
