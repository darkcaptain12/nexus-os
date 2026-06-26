import { TrendingUp } from 'lucide-react';

export const metadata = { title: 'Trading — NEXUS OS' };

export default function TrendingUpPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20">
      <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <h1 className="text-xl font-semibold text-foreground">Trading</h1>
      <p className="mt-2 text-sm text-muted-foreground">Trading modülü yakında aktif olacak</p>
    </div>
  );
}
