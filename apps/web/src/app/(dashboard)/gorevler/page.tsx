import { CheckSquare } from 'lucide-react';

export const metadata = { title: 'Görevler — NEXUS OS' };

export default function CheckSquarePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20">
      <CheckSquare className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <h1 className="text-xl font-semibold text-foreground">Görevler</h1>
      <p className="mt-2 text-sm text-muted-foreground">Görev yönetimi yakında aktif olacak</p>
    </div>
  );
}
