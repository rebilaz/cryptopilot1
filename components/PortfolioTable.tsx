export default function PortfolioTable() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-x-auto">
      <table className="min-w-full text-sm text-white/80">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-3 text-left font-semibold">Actif</th>
            <th className="px-4 py-3 text-left font-semibold">Poids</th>
            <th className="px-4 py-3 text-left font-semibold">Prix</th>
            <th className="px-4 py-3 text-left font-semibold">Variation</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-white/10">
            <td className="px-4 py-3">BTC</td>
            <td className="px-4 py-3">50%</td>
            <td className="px-4 py-3">65 000</td>
            <td className="px-4 py-3 text-green-400 font-medium">+2.1%</td>
          </tr>
          <tr className="border-b border-white/10">
            <td className="px-4 py-3">ETH</td>
            <td className="px-4 py-3">30%</td>
            <td className="px-4 py-3">3 200</td>
            <td className="px-4 py-3 text-green-400 font-medium">+1.5%</td>
          </tr>
          <tr>
            <td className="px-4 py-3">USDT</td>
            <td className="px-4 py-3">20%</td>
            <td className="px-4 py-3">1</td>
            <td className="px-4 py-3 text-white/60 font-medium">0%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
