'use client';

import { useState } from 'react';
import {
  User,
  Palette,
  Bell,
  Shield,
  Smartphone,
  Brain,
  Globe,
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface SettingsPanelProps {
  userName: string;
  userEmail: string;
}

type SettingsTab = 'profile' | 'theme' | 'language' | 'notifications' | 'security' | 'devices' | 'ai';

const TABS: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'theme', label: 'Tema', icon: Palette },
  { id: 'language', label: 'Dil', icon: Globe },
  { id: 'notifications', label: 'Bildirimler', icon: Bell },
  { id: 'security', label: 'Güvenlik', icon: Shield },
  { id: 'devices', label: 'Cihazlar', icon: Smartphone },
  { id: 'ai', label: 'Yapay Zeka', icon: Brain },
];

export function SettingsPanel({ userName, userEmail }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Profil</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Ad Soyad</label>
                <input
                  type="text"
                  defaultValue={userName}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  readOnly
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">E-posta</label>
                <input
                  type="email"
                  defaultValue={userEmail}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  readOnly
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'theme' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Tema</h2>
            <div className="flex gap-3">
              {(['dark', 'light', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    theme === t
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {t === 'dark' ? 'Koyu' : t === 'light' ? 'Açık' : 'Sistem'}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'language' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Dil</h2>
            <div className="flex gap-3">
              <button className="rounded-lg border border-primary bg-primary/10 px-4 py-2 text-sm text-primary">
                Türkçe
              </button>
              <button className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground" disabled>
                English (Yakında)
              </button>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Bildirimler</h2>
            <p className="text-sm text-muted-foreground">Bildirim ayarları yakında aktif olacak.</p>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Güvenlik</h2>
            <p className="text-sm text-muted-foreground">Güvenlik ayarları yakında aktif olacak.</p>
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Cihazlar</h2>
            <p className="text-sm text-muted-foreground">Cihaz yönetimi yakında aktif olacak.</p>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Yapay Zeka</h2>
            <p className="text-sm text-muted-foreground">AI konfigürasyonu yakında aktif olacak.</p>
          </div>
        )}
      </div>
    </div>
  );
}
