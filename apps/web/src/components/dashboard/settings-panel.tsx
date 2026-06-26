'use client';

import { useState } from 'react';
import { User, Palette, Bell, Shield, Smartphone, Brain, Globe, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { updateUserName, updateUserProfile, updateUserPreferences } from '@/lib/profile-actions';

interface SettingsPanelProps {
  userName: string;
  userEmail: string;
  bio: string;
  timezone: string;
  currency: string;
  currentTheme: string;
  notificationsEnabled: boolean;
}

type SettingsTab =
  | 'profile'
  | 'theme'
  | 'language'
  | 'notifications'
  | 'security'
  | 'devices'
  | 'ai';

const TABS: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'theme', label: 'Tema', icon: Palette },
  { id: 'language', label: 'Dil', icon: Globe },
  { id: 'notifications', label: 'Bildirimler', icon: Bell },
  { id: 'security', label: 'Güvenlik', icon: Shield },
  { id: 'devices', label: 'Cihazlar', icon: Smartphone },
  { id: 'ai', label: 'Yapay Zeka', icon: Brain },
];

export function SettingsPanel({
  userName,
  userEmail,
  bio,
  timezone,
  currency,
  currentTheme,
  notificationsEnabled,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  async function handleAction(
    action: (fd: FormData) => Promise<{ success?: boolean; error?: string }>,
    formData: FormData,
  ) {
    setSaving(true);
    setSaved(false);
    setError(undefined);
    const result = await action(formData);
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

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

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive-foreground rounded-lg border p-3 text-sm">
          {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400">
          <Check className="h-4 w-4" /> Kaydedildi
        </div>
      )}

      <div className="border-border bg-card rounded-xl border p-6">
        {activeTab === 'profile' && (
          <form action={(fd) => handleAction(updateUserName, fd)} className="space-y-4">
            <h2 className="text-lg font-semibold">Profil</h2>
            <div>
              <label className="text-muted-foreground mb-1 block text-sm">Ad Soyad</label>
              <input
                name="name"
                type="text"
                defaultValue={userName}
                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-sm">E-posta</label>
              <input
                type="email"
                defaultValue={userEmail}
                className="border-input bg-background text-muted-foreground w-full rounded-lg border px-3 py-2 text-sm"
                readOnly
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-sm">Hakkında</label>
              <textarea
                name="bio"
                defaultValue={bio}
                rows={3}
                placeholder="Kendiniz hakkında kısa bir bilgi..."
                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </form>
        )}

        {activeTab === 'theme' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Tema</h2>
            <div className="flex gap-3">
              {(['dark', 'light', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTheme(t);
                    const fd = new FormData();
                    fd.set('theme', t);
                    handleAction(updateUserPreferences, fd);
                  }}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    (theme ?? currentTheme) === t
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
          <form action={(fd) => handleAction(updateUserProfile, fd)} className="space-y-4">
            <h2 className="text-lg font-semibold">Dil ve Bölge</h2>
            <div>
              <label className="text-muted-foreground mb-1 block text-sm">Saat Dilimi</label>
              <select
                name="timezone"
                defaultValue={timezone}
                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="Europe/Istanbul">Europe/Istanbul (TR)</option>
                <option value="Europe/London">Europe/London (UK)</option>
                <option value="America/New_York">America/New_York (US East)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (US West)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JP)</option>
              </select>
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-sm">Para Birimi</label>
              <select
                name="currency"
                defaultValue={currency}
                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="TRY">TRY (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </form>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Bildirimler</h2>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked={notificationsEnabled}
                onChange={(e) => {
                  const fd = new FormData();
                  fd.set('notifications_enabled', String(e.target.checked));
                  handleAction(updateUserPreferences, fd);
                }}
                className="border-input h-4 w-4 rounded"
              />
              <span className="text-foreground text-sm">Bildirimleri etkinleştir</span>
            </label>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Güvenlik</h2>
            <p className="text-muted-foreground text-sm">
              Şifre değiştirmek için şifre sıfırlama bağlantısı kullanın.
            </p>
            <a
              href="/sifre-sifirla"
              className="bg-muted text-foreground hover:bg-muted/80 inline-block rounded-lg px-4 py-2 text-sm"
            >
              Şifre Sıfırla
            </a>
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Cihazlar</h2>
            <p className="text-muted-foreground text-sm">Bağlı cihaz bulunmuyor.</p>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Yapay Zeka</h2>
            <p className="text-muted-foreground text-sm">
              AI sağlayıcı yapılandırması için{' '}
              <code className="bg-muted rounded px-1 py-0.5 text-xs">.env.local</code> dosyasına API
              anahtarı ekleyin.
            </p>
            <div className="space-y-2">
              {['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'OPENROUTER_API_KEY'].map(
                (key) => (
                  <div
                    key={key}
                    className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2"
                  >
                    <code className="text-foreground text-xs">{key}</code>
                    <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] text-yellow-400">
                      Yapılandırılmamış
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
