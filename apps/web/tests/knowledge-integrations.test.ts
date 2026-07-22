import { describe, it, expect } from 'vitest';
import { createAgent } from '../src/lib/agents/agent-runtime';
import { runNextStep } from '../src/lib/agents/agent-runner';
import { getKnowledgeGraph } from '../src/lib/knowledge/graph-store';
import { parseVoiceIntent, handleVoiceIntent } from '../src/lib/quant/services/voice-service';
import { recordMarketAnalysis } from '../src/lib/knowledge/auto-linker';

const mockExecutor = async () => ({ ok: true });

describe('Knowledge Graph — Agent entegrasyonu', () => {
  it('createAgent graph’a agent+goal node’ları ekler', () => {
    const graph = getKnowledgeGraph();
    const name = `KG Agent ${Date.now()}`;
    createAgent({ name, goal: 'Bildirim gönder' });
    const agentNode = graph.findNode('agent', name);
    expect(agentNode).not.toBeNull();
    expect(graph.degree(agentNode!.id)).toBeGreaterThanOrEqual(1);
  });

  it('tamamlanan adım task node olarak graph’a bağlanır', async () => {
    const graph = getKnowledgeGraph();
    const name = `KG Step Agent ${Date.now()}`;
    const agent = createAgent({ name, goal: 'Bildirim gönder' });
    await runNextStep(agent.id, mockExecutor);
    const taskNode = graph.findNode('task', `Bildirim Gönder [${name}]`);
    expect(taskNode).not.toBeNull();
    const relations = graph.getEdgesOf(taskNode!.id).map((e) => e.relation);
    expect(relations).toContain('belongs_to'); // task → goal
  });
});

describe('Knowledge Graph — Voice recall entegrasyonu', () => {
  it('parseVoiceIntent "ne karar vermiştim" → memory.recall', () => {
    const intent = parseVoiceIntent('Geçen hafta BTC hakkında ne karar vermiştim?');
    expect(intent.intent).toBe('memory.recall');
    expect(intent.params.topic).toBe('BTC');
    expect(intent.params.period).toBe('last_week');
  });

  it('memory.recall graph’taki kararı bulup konuşma metni döner', async () => {
    recordMarketAnalysis('BTCUSDT', 'okx', 'Trend up, long senaryosu %64 olasılık');
    const response = await handleVoiceIntent({
      intent: 'memory.recall',
      confidence: 0.9,
      params: { topic: 'BTCUSDT', period: 'last_week' },
      rawText: 'geçen hafta BTC hakkında ne karar vermiştim',
    });
    expect(response.intent).toBe('memory.recall');
    expect(response.data).not.toBeNull();
    const results = (response.data as { results: { type: string }[] }).results;
    expect(results.length).toBeGreaterThan(0);
    expect(response.speech.length).toBeGreaterThan(10);
  });

  it('memory.recall kayıt yoksa nazik cevap döner', async () => {
    const response = await handleVoiceIntent({
      intent: 'memory.recall',
      confidence: 0.9,
      params: { topic: 'HİÇYOKBÖYLEŞEY999' },
      rawText: 'HİÇYOKBÖYLEŞEY999 hakkında ne karar vermiştim',
    });
    expect(response.speech).toContain('bulamadım');
  });
});
