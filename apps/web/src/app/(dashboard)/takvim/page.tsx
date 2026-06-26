import { Calendar } from 'lucide-react';

export const metadata = { title: 'Takvim — NEXUS OS' };

export default function CalendarPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20">
      <Calendar className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <h1 className="text-xl font-semibold text-foreground">Takvim</h1>
      <p className="mt-2 text-sm text-muted-foreground">Takvim yakında aktif olacak</p>
    </div>
  );
}
