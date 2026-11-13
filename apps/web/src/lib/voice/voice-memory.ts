import type { ConversationTurn } from './types';
import { getMemoryStore } from '@/lib/memory/store';
import { ingestText } from '@/lib/knowledge/auto-linker';
import { link } from '@/lib/knowledge/relationship-engine';

// Voice Memory — konuşmalar mevcut MemoryStore'a yazılır (source: 'voice'),
// önemli kararlar Knowledge Graph'a bağlanır. Yeni memory sistemi YOK.

const IMPORTANT_INTENTS = new Set([
  'task.create',
  'project.status',
  'trading.analysis',
  'trading.status',
  'file.analyze',
  'workflow.start',
  'report.generate',
]);

/** Bir konuşma turunu (user + apex) Memory'ye kaydet. */
export function recordConversationTurn(
  sessionId: string,
  userTurn: ConversationTurn,
  apexTurn: ConversationTurn,
): void {
  getMemoryStore().addTimelineEntry({
    source: 'voice',
    title: `Sesli konuşma: ${apexTurn.intent ?? 'sohbet'}`,
    description: `Kullanıcı: "${userTurn.text}" → APEX: "${apexTurn.text.slice(0, 200)}"`,
    timestamp: apexTurn.createdAt,
    metadata: { sessionId, intent: apexTurn.intent, requiresApproval: apexTurn.requiresApproval },
  });

  // Önemli intent'ler Knowledge Graph'a bağlanır
  if (apexTurn.intent && IMPORTANT_INTENTS.has(apexTurn.intent)) {
    const { source } = ingestText(
      'note',
      `Sesli komut: ${userTurn.text.slice(0, 80)}`,
      userTurn.text,
      {
        sessionId,
        intent: apexTurn.intent,
      },
    );
    // Konuşma → karar ilişkisi (önemli olanlar)
    if (apexTurn.intent.startsWith('trading') || apexTurn.intent === 'task.create') {
      link(
        { type: 'note', name: `Sesli komut: ${userTurn.text.slice(0, 80)}` },
        'generated_from',
        {
          type: 'decision',
          name: `Voice: ${apexTurn.intent} (${new Date().toISOString().slice(0, 10)})`,
        },
        0.8,
      );
    }
    void source;
  }
}
