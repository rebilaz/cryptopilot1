// Minimal toast abstraction. If a global toast system (like shadcn) exists, it will be used.
interface ToastOpts { title?: string; description?: string; variant?: 'default' | 'destructive' | string }
type ToastFn = (opts: ToastOpts) => void;

function fallbackToast(opts: ToastOpts) {
  if (typeof window === 'undefined') return;
  const msg = (opts.title ? opts.title + ': ' : '') + (opts.description || '');
  if (opts.variant === 'destructive') console.error(msg); else console.log(msg);
  if (!('Notification' in window)) return;
}

export function toast(opts: ToastOpts) {
  const g: any = (typeof window !== 'undefined') ? window : {};
  if (g.toast && typeof g.toast === 'function') return g.toast(opts);
  // shadcn style
  if (g.__toast && typeof g.__toast === 'function') return g.__toast(opts);
  return fallbackToast(opts);
}

export const toastSuccess = (description: string) => toast({ title: 'Succès', description });
export const toastError = (description: string) => toast({ title: 'Erreur', description, variant: 'destructive' });