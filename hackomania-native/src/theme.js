export const COLORS = {
  bg: '#f4f9fc',
  panel: '#ffffff',
  panelSoft: '#eaf7fb',
  border: '#c6d8e5',
  text: '#1f3448',
  subtext: '#5c7387',
  accent: '#00a8b8',
  accentDark: '#2f5f95',
  success: '#0c9f96',
  warning: '#2f7fb3',
  danger: '#bb4a56',
};

export const DARK_COLORS = {
  bg: '#0e1c2d',
  panel: '#152338',
  panelSoft: '#1b3549',
  border: '#2a4057',
  text: '#e6f0f8',
  subtext: '#9eb3c7',
  accent: '#1cc3cf',
  accentDark: '#7ebcf1',
  success: '#57d4cb',
  warning: '#68b4e0',
  danger: '#ea7d88',
};

export const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'insights', label: 'Insights', icon: '💡' },
  { key: 'simulator', label: 'Simulator', icon: '⚡' },
  { key: 'chat', label: 'Chat', icon: '💬' },
  { key: 'streak', label: 'Streak', icon: '🎯' },
];

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
