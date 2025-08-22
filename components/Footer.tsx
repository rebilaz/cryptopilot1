export function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-background/70 backdrop-blur py-5 text-center text-xs text-white/50">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 sm:flex-row sm:justify-between sm:text-left">
        <p>© {new Date().getFullYear()} CryptoPilot • Éducatif uniquement</p>
        <div className="flex gap-4">
          <a href="/faq" className="hover:text-white transition-colors">FAQ</a>
          <a href="/pricing" className="hover:text-white transition-colors">Tarifs</a>
        </div>
      </div>
    </footer>
  );
}
