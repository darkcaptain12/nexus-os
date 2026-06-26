import { Bell } from 'lucide-react';

export const metadata = { title: 'Bildirimler — NEXUS OS' };

export default function BellPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20">
      <Bell className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <h1 className="text-xl font-semibold text-foreground">Bildirimler</h1>
      <p className="mt-2 text-sm text-muted-foreground">Bildirim merkezi yakında aktif olacak</p>
    </div>
  );
}
