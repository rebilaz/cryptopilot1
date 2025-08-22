export default function ProgressionCard() {
  const steps = [
    { label: "Explorer", color: "bg-emerald-500 text-white" },
    { label: "Stratège", color: "bg-white/20 text-white/80" },
    { label: "Analyste", color: "bg-white/20 text-white/80" },
    { label: "Trader", color: "bg-white/20 text-white/80" },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, idx) => (
          <div key={step.label} className="flex-1 flex flex-col items-center">
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-full font-semibold text-xs ${step.color}`}
            >
              {idx + 1}
            </div>
            <span className="mt-2 text-xs">{step.label}</span>
            {idx < steps.length - 1 && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 w-full h-1 bg-white/10" />
            )}
          </div>
        ))}
      </div>
      <div className="text-sm text-white/90 mt-2">
        Niveau actuel : <span className="font-semibold text-emerald-400">Explorer</span>
      </div>
    </div>
  );
}
