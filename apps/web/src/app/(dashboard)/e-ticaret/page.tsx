import { ShoppingBag } from 'lucide-react';

export const metadata = { title: 'E-Ticaret — NEXUS OS' };

export default function ShoppingBagPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20">
      <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <h1 className="text-xl font-semibold text-foreground">E-Ticaret</h1>
      <p className="mt-2 text-sm text-muted-foreground">E-ticaret modülü yakında aktif olacak</p>
    </div>
  );
}
