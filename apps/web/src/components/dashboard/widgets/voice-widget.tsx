import { Mic, MicOff, Radio, Volume2, Moon, Zap } from 'lucide-react';
import type { VoiceStatus, ConversationSession } from '@/lib/voice/types';
import { WidgetShell } from './widget-shell';

const STATE_CONFIG: Record<string, { label: string; color: string; icon: typeof Mic }> = {
  sleeping: { label: 'Uyuyor', color: 'text-muted-foreground', icon: Moon },
  listening: { label: 'Dinliyor', color: 'text-green-400', icon: Mic },
  thinking: { label: 'Düşünüyor', color: 'text-blue-400', icon: Radio },
  speaking: { label: 'Konuşuyor', color: 'text-purple-400', icon: Volume2 },
  idle: { label: 'Hazır', color: 'text-cyan-400', icon: Radio },
};

export interface VoiceWidgetProps {
  status: VoiceStatus;
  currentConversation: ConversationSession | null;
}

export function VoiceWidget({ status, currentConversation }: VoiceWidgetProps) {
  const stateConfig = STATE_CONFIG[status.state] ?? STATE_CONFIG.sleeping!;
  const StateIcon = stateConfig.icon;
  const recentTurns = currentConversation?.turns.slice(-4) ?? [];

  return (
    <WidgetShell
      title="APEX Voice"
      icon={<Mic className="h-4 w-4" />}
      action={
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${status.active ? 'bg-green-500/20 text-green-400' : 'bg-muted/40 text-muted-foreground'}`}
        >
          <StateIcon className="h-2.5 w-2.5" />
          {stateConfig.label}
        </span>
      }
    >
      {/* Durum + dinleme göstergesi */}
      <div className="mb-3 grid grid-cols-4 gap-1.5">
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className={`text-[13px] font-bold ${stateConfig.color}`}>{status.wakeCount}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Wake</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-foreground text-[13px] font-bold">{status.totalTurns}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Tur</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-foreground text-[13px] font-bold">{status.averageResponseMs}ms</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Ort. Yanıt</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[13px] font-bold ${status.micPermission === 'granted' ? 'text-green-400' : 'text-orange-400'}`}
          >
            {status.micPermission === 'granted' ? '✓' : '—'}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Mikrofon</p>
        </div>
      </div>

      {/* Dinleme göstergesi (animasyonlu) */}
      {status.listeningIndicator && (
        <div className="mb-2 flex items-center gap-2 rounded bg-green-500/10 px-2 py-1.5">
          <div className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-3 w-0.5 animate-pulse rounded-full bg-green-400"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <p className="text-[10px] text-green-400">Dinliyorum...</p>
        </div>
      )}

      {/* Follow-up aktif */}
      {status.followUpActive && !status.listeningIndicator && (
        <div className="mb-2 flex items-center gap-1.5 rounded bg-cyan-500/10 px-2 py-1">
          <Zap className="h-3 w-3 text-cyan-400" />
          <p className="text-[10px] text-cyan-400">Takip modu — wake word gerekmez</p>
        </div>
      )}

      {/* Provider + CPU */}
      <div className="mb-2 flex items-center gap-1 text-[10px]">
        {status.micPermission === 'granted' ? (
          <Mic className="text-muted-foreground h-3 w-3" />
        ) : (
          <MicOff className="text-muted-foreground h-3 w-3" />
        )}
        <span className="text-muted-foreground">STT:</span>
        <span className="text-foreground font-medium">{status.sttProvider}</span>
        <span className="text-muted-foreground">· TTS:</span>
        <span className="text-foreground font-medium">{status.ttsProvider}</span>
        {status.cpuFriendly && <span className="text-green-400">· CPU dostu</span>}
      </div>

      {/* Son konuşmalar */}
      {recentTurns.length === 0 ? (
        <p className="text-muted-foreground py-3 text-center text-[10px]">
          "Hey APEX" ile başlat — sürekli dinler
        </p>
      ) : (
        <div className="space-y-1">
          {recentTurns.map((turn) => (
            <div key={turn.id} className="flex items-start gap-1 text-[10px]">
              <span
                className={`shrink-0 font-medium ${turn.role === 'user' ? 'text-blue-400' : 'text-primary'}`}
              >
                {turn.role === 'user' ? 'Sen' : 'APEX'}:
              </span>
              <span className="text-muted-foreground truncate">{turn.text || '(kesildi)'}</span>
              {turn.requiresApproval && <span className="shrink-0 text-orange-400">⚠</span>}
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
