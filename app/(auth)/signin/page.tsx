"use client";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
        <h1 className="text-xl font-semibold mb-4">Se connecter</h1>
        <div className="space-y-3">
          <button
            onClick={() => signIn("email")}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Email (magic link)
          </button>
          <button
            onClick={() => signIn("google")}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Google
          </button>
        </div>
      </div>
    </main>
  );
}
