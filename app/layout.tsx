import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://cryptopilot.fr"),
  title: "CryptoPilot 🚀",
  description: "Ton copilote crypto avec IA et gamification",
  alternates: { canonical: "/", languages: { fr: "/fr" } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
  <body className={`${inter.variable} bg-white text-neutral-900 min-h-screen font-sans antialiased`}>
        <Providers>
          <div className="app-shell">
            <Header />
            <div className="app-main">
              <Sidebar />
              <div className="flex-1 w-full">{children}</div>
            </div>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
