export default function PricingPage() {
  const plans = [
    { name: "Gratuit", price: "0€", desc: "Fonctionnalités de base", color: "bg-white/5" },
    { name: "Standard", price: "15€", desc: "À venir", color: "bg-indigo-500/10" },
    { name: "Pro", price: "29€", desc: "À venir", color: "bg-emerald-500/10" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-center mb-10">Tarifs</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl border border-white/10 p-8 flex flex-col items-center ${plan.color}`}
          >
            <div className="text-lg font-semibold mb-2">{plan.name}</div>
            <div className="text-3xl font-bold mb-4">{plan.price}<span className="text-base font-normal text-white/60">/mois</span></div>
            <div className="mb-6 text-white/70">{plan.desc}</div>
            <button
              disabled
              className="w-full rounded-lg px-6 py-2 bg-white/10 text-white/70 font-semibold cursor-not-allowed opacity-60"
            >
              Souscrire (à venir)
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
