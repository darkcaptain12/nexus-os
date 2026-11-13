import type { AppCategory } from '../types';

const CATEGORY_MAP: Record<string, AppCategory> = {
  Code: 'coding',
  'Visual Studio Code': 'coding',
  Cursor: 'coding',
  Zed: 'coding',
  'IntelliJ IDEA': 'coding',
  WebStorm: 'coding',
  PyCharm: 'coding',
  GoLand: 'coding',
  PhpStorm: 'coding',
  RustRover: 'coding',
  Xcode: 'coding',
  'Android Studio': 'coding',
  'Sublime Text': 'coding',
  Neovim: 'coding',
  vim: 'coding',

  'Google Chrome': 'browsing',
  Chrome: 'browsing',
  Safari: 'browsing',
  Firefox: 'browsing',
  'Brave Browser': 'browsing',
  Brave: 'browsing',
  'Microsoft Edge': 'browsing',
  Arc: 'browsing',
  Opera: 'browsing',
  Vivaldi: 'browsing',

  Slack: 'communication',
  Discord: 'communication',
  Telegram: 'communication',
  WhatsApp: 'communication',
  Messages: 'communication',
  Mail: 'communication',
  'Microsoft Outlook': 'communication',
  Thunderbird: 'communication',

  Zoom: 'meeting',
  'Google Meet': 'meeting',
  'Microsoft Teams': 'meeting',
  FaceTime: 'meeting',
  Webex: 'meeting',

  Figma: 'design',
  Sketch: 'design',
  'Adobe Photoshop': 'design',
  'Adobe Illustrator': 'design',
  'Adobe XD': 'design',
  Canva: 'design',

  Notion: 'writing',
  Obsidian: 'writing',
  Bear: 'writing',
  Pages: 'writing',
  'Microsoft Word': 'writing',
  'Google Docs': 'writing',
  Notes: 'writing',
  TextEdit: 'writing',

  Terminal: 'terminal',
  iTerm2: 'terminal',
  iTerm: 'terminal',
  Warp: 'terminal',
  Alacritty: 'terminal',
  kitty: 'terminal',
  Hyper: 'terminal',
  'Windows Terminal': 'terminal',

  Spotify: 'media',
  'Apple Music': 'media',
  Music: 'media',
  VLC: 'media',
  'QuickTime Player': 'media',
  'YouTube Music': 'media',

  Finder: 'system',
  'Activity Monitor': 'system',
  'System Settings': 'system',
  'System Preferences': 'system',
  'Disk Utility': 'system',
  Console: 'system',
};

export function categorizeApp(appName: string): AppCategory {
  return CATEGORY_MAP[appName] ?? 'other';
}

export function isSensitiveApp(appName: string, blacklist: string[]): boolean {
  return blacklist.some((b) => appName.toLowerCase().includes(b.toLowerCase()));
}

export function shouldTrackWindow(appName: string, title: string, blacklist: string[]): boolean {
  if (isSensitiveApp(appName, blacklist)) return false;

  const sensitivePatterns = [
    /password/i,
    /private/i,
    /incognito/i,
    /secret/i,
    /token/i,
    /api.key/i,
  ];
  for (const pattern of sensitivePatterns) {
    if (pattern.test(title)) return false;
  }

  return true;
}

export function getCategoryLabel(category: AppCategory): string {
  const labels: Record<AppCategory, string> = {
    coding: 'Kodlama',
    browsing: 'Tarayıcı',
    communication: 'İletişim',
    meeting: 'Toplantı',
    design: 'Tasarım',
    writing: 'Yazı',
    terminal: 'Terminal',
    media: 'Medya',
    system: 'Sistem',
    other: 'Diğer',
  };
  return labels[category];
}
