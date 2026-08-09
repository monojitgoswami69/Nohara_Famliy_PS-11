/**
 * SettingsPanel — Modal-based IDE settings panel.
 * Controls: font size, font family, tab size, word wrap, minimap, line numbers, theme.
 * All settings are persisted to localStorage.
 */

import React, { useEffect } from 'react';
import { X, Settings2, Type, AlignLeft, Hash, Eye, Map, ToggleLeft, ToggleRight } from 'lucide-react';

export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: 'on' | 'off';
  showMinimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
}

export const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 16,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  tabSize: 2,
  wordWrap: 'on',
  showMinimap: true,
  lineNumbers: 'on',
};

export function loadSettings(): EditorSettings {
  try {
    const raw = localStorage.getItem('codecollab_editor_settings');
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: EditorSettings): void {
  localStorage.setItem('codecollab_editor_settings', JSON.stringify(settings));
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  settings: EditorSettings;
  onSettingsChange: (settings: EditorSettings) => void;
  onToggleTheme: () => void;
}

const FONT_FAMILIES = [
  { label: 'JetBrains Mono', value: "'JetBrains Mono', 'Fira Code', monospace" },
  { label: 'Fira Code', value: "'Fira Code', monospace" },
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
  { label: 'Consolas', value: "'Consolas', 'Courier New', monospace" },
  { label: 'Source Code Pro', value: "'Source Code Pro', monospace" },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  isDark,
  settings,
  onSettingsChange,
  onToggleTheme,
}) => {
  // Persist when settings change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const update = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const bg = isDark ? 'bg-[#181C2A]' : 'bg-white';
  const sectionBg = isDark ? 'bg-[#1E2235]' : 'bg-slate-50';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputStyle = `px-3 py-1.5 border-2 border-black font-bold text-sm outline-none focus:bg-neo-yellow/20 ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-black'}`;
  const toggleBtn = (on: boolean) => `flex items-center gap-1 px-2 py-1 border-2 border-black font-black text-xs uppercase transition-all ${on ? 'bg-neo-green text-black' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'}`;

  const SectionHeader = ({ icon: Icon, title }: { icon: React.FC<any>; title: string }) => (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} className="text-neo-yellow" />
      <span className={`text-xs font-black uppercase tracking-wider ${textMuted}`}>{title}</span>
    </div>
  );

  const SettingRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between py-2 border-b border-black/10">
      <span className={`text-sm font-bold ${textPrimary}`}>{label}</span>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg mx-4 ${bg} border-3 border-black shadow-[10px_10px_0px_#000] overflow-hidden animate-fade-in`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2.5 border-black bg-neo-yellow text-black font-black">
          <div className="flex items-center gap-2">
            <Settings2 size={20} className="text-black" />
            <h2 className="text-base font-black uppercase tracking-wide">Editor Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-black bg-neo-pink text-black hover:bg-red-400 font-bold transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

          {/* Appearance */}
          <div className={`p-4 border-2 border-black ${sectionBg}`}>
            <SectionHeader icon={Eye} title="Appearance" />
            <SettingRow label="Theme">
              <button onClick={onToggleTheme} className={`flex items-center gap-2 px-3 py-1.5 border-2 border-black font-black text-xs uppercase transition-all ${isDark ? 'bg-slate-700 text-white hover:bg-neo-yellow hover:text-black' : 'bg-neo-yellow text-black hover:bg-slate-200 hover:text-slate-900'}`}>
                {isDark ? '🌙 Dark' : '☀️ Light'}
              </button>
            </SettingRow>
          </div>

          {/* Typography */}
          <div className={`p-4 border-2 border-black ${sectionBg}`}>
            <SectionHeader icon={Type} title="Typography" />

            <SettingRow label="Font Size">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => update('fontSize', Math.max(10, settings.fontSize - 1))}
                  className="w-7 h-7 border-2 border-black font-black text-sm flex items-center justify-center hover:bg-neo-yellow hover:text-black transition-all"
                >−</button>
                <span className={`w-8 text-center font-black text-sm ${textPrimary}`}>{settings.fontSize}</span>
                <button
                  onClick={() => update('fontSize', Math.min(28, settings.fontSize + 1))}
                  className="w-7 h-7 border-2 border-black font-black text-sm flex items-center justify-center hover:bg-neo-yellow hover:text-black transition-all"
                >+</button>
              </div>
            </SettingRow>

            <SettingRow label="Font Family">
              <select
                value={settings.fontFamily}
                onChange={e => update('fontFamily', e.target.value)}
                className={`${inputStyle} text-xs`}
              >
                {FONT_FAMILIES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </SettingRow>
          </div>

          {/* Editor */}
          <div className={`p-4 border-2 border-black ${sectionBg}`}>
            <SectionHeader icon={AlignLeft} title="Editor" />

            <SettingRow label="Tab Size">
              <div className="flex gap-1">
                {[2, 4, 8].map(n => (
                  <button
                    key={n}
                    onClick={() => update('tabSize', n)}
                    className={`px-3 py-1 border-2 border-black font-black text-xs transition-all ${settings.tabSize === n ? 'bg-neo-yellow text-black' : isDark ? 'bg-slate-700 text-white hover:bg-neo-yellow hover:text-black' : 'bg-white text-black hover:bg-neo-yellow'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </SettingRow>

            <SettingRow label="Word Wrap">
              <button
                onClick={() => update('wordWrap', settings.wordWrap === 'on' ? 'off' : 'on')}
                className={toggleBtn(settings.wordWrap === 'on')}
              >
                {settings.wordWrap === 'on' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                {settings.wordWrap === 'on' ? 'On' : 'Off'}
              </button>
            </SettingRow>

            <SettingRow label="Minimap">
              <button
                onClick={() => update('showMinimap', !settings.showMinimap)}
                className={toggleBtn(settings.showMinimap)}
              >
                {settings.showMinimap ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                {settings.showMinimap ? 'Shown' : 'Hidden'}
              </button>
            </SettingRow>
          </div>

          {/* Line Numbers */}
          <div className={`p-4 border-2 border-black ${sectionBg}`}>
            <SectionHeader icon={Hash} title="Line Numbers" />
            <SettingRow label="Display">
              <div className="flex gap-1">
                {(['on', 'off', 'relative'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => update('lineNumbers', mode)}
                    className={`px-3 py-1 border-2 border-black font-black text-xs uppercase transition-all ${settings.lineNumbers === mode ? 'bg-neo-yellow text-black' : isDark ? 'bg-slate-700 text-white hover:bg-neo-yellow hover:text-black' : 'bg-white text-black hover:bg-neo-yellow'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </SettingRow>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t-2 border-black flex items-center justify-between ${isDark ? 'bg-[#141724]' : 'bg-slate-100'}`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>
            Settings auto-saved to local storage
          </span>
          <button
            onClick={() => { onSettingsChange(DEFAULT_SETTINGS); }}
            className={`px-3 py-1 border-2 border-black font-black text-[10px] uppercase transition-all hover:bg-neo-pink hover:text-black ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'}`}
          >
            Reset Defaults
          </button>
        </div>
      </div>
    </div>
  );
};
