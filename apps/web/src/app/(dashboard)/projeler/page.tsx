import { FolderKanban } from 'lucide-react';

export const metadata = { title: 'Projeler — NEXUS OS' };

export default function FolderKanbanPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20">
      <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <h1 className="text-xl font-semibold text-foreground">Projeler</h1>
      <p className="mt-2 text-sm text-muted-foreground">Proje yönetimi yakında aktif olacak</p>
    </div>
  );
}
