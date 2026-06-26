import { Brain } from 'lucide-react';

export const metadata = { title: 'Yapay Zeka — NEXUS OS' };

export default function BrainPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20">
      <Brain className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <h1 className="text-xl font-semibold text-foreground">Yapay Zeka</h1>
      <p className="mt-2 text-sm text-muted-foreground">AI asistan yakında aktif olacak</p>
    </div>
  );
}
