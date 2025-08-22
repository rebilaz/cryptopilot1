export default function FAQPage() {
  const items = [
    {
      q: "Est-ce que CryptoPilot donne des signaux ?",
      a: "Non. CryptoPilot explique ton portefeuille et t’aide à progresser. Éducatif uniquement.",
    },
    {
      q: "Puis-je connecter mon wallet ?",
      a: "Bientôt. Pour l’instant, saisis simplement tes positions pour tester la démo.",
    },
    {
      q: "Mes données sont-elles privées ?",
      a: "Les analyses sont pensées pour respecter ta vie privée. Jamais de clés privées.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6 text-center">FAQ</h1>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        {items.map((it, i) => (
          <details key={i} className="p-0">
            <summary className="cursor-pointer text-base font-medium">{it.q}</summary>
            <p className="mt-2 text-sm text-white/80">{it.a}</p>
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
