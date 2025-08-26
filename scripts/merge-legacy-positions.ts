import { prisma } from '@/lib/prisma';
import { normalizeAsset } from '@/lib/prices/normalizeAsset';

async function run() {
  const portfolios = await prisma.portfolio.findMany({ include: { positions: true, user: true } });
  for (const pf of portfolios) {
    const groups = new Map<string, typeof pf.positions>();
    for (const pos of pf.positions) {
      const canonical = normalizeAsset(pos.asset || pos.chain || '');
      const arr = groups.get(canonical) || [] as any;
      arr.push(pos);
      groups.set(canonical, arr);
    }
    for (const [canonicalId, list] of groups.entries()) {
      if (list.length <= 1) continue;
      const total = list.reduce((s,p)=> s + p.amount.toNumber(), 0);
      // Keep first
      const keep = list[0];
      await prisma.position.update({ where: { id: keep.id }, data: { asset: canonicalId, chain: (keep.chain||canonicalId).toUpperCase(), amount: total } });
      const toDelete = list.slice(1).map(p=>p.id);
      if (toDelete.length) await prisma.position.deleteMany({ where: { id: { in: toDelete } } });
      console.log('migrated', { userId: pf.userId, portfolioId: pf.id, canonicalId, mergedCount: list.length });
    }
  }
}

run().then(()=>{ console.log('done merge-legacy-positions'); process.exit(0); }).catch(e=>{ console.error(e); process.exit(1); });
