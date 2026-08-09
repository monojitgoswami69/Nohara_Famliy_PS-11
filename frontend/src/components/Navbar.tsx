/**
 * Navbar — Beautiful multi-section top navigation bar.
 * Sections: [Logo + Brand] | [File·Edit·View·Terminal·Help menus] | [Breadcrumb] | [Actions]
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Sun, Moon, Users, MessageSquare, PanelRightClose, Search,
  FileCode, Plus, Upload, Github, Play, Sparkles,
  ChevronRight, Menu, Keyboard, HelpCircle,
  Eye, Terminal, Settings2, FileInput, FilePlus2, X
} from 'lucide-react';
import { StoredFile } from '../services/storageService';

interface NavbarProps {
  isDark: boolean;
  toggleTheme: () => void;
  activeFile: StoredFile | null;
  onFileCreate: () => void;
  onFileUpload: () => void;
  onOpenGitHub: () => void;
  onOpenCollab: () => void;
  onRunCode: () => void;
  onFormatCode: () => void;
  onToggleSidebar: () => void;
  onToggleTerminal: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenCommandPalette: () => void;
  isInRoom: boolean;
  isChatOpen: boolean;
  onToggleChat: () => void;
  onMobileMenu: () => void;
}

interface MenuDef {
  label: string;
  items: MenuItemDef[];
}

interface MenuItemDef {
  label: string;
  shortcut?: string;
  icon?: React.FC<{ size?: number }>;
  action: () => void;
  separator?: false;
}

interface SeparatorDef {
  separator: true;
}

type MenuEntry = MenuItemDef | SeparatorDef;

const DropdownMenu: React.FC<{
  label: string;
  entries: MenuEntry[];
  isDark: boolean;
}> = ({ label, entries, isDark }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const menuBg = isDark ? 'bg-[#1A1D2E] text-white' : 'bg-white text-black';
  const itemHover = isDark ? 'hover:bg-slate-700/80' : 'hover:bg-neo-yellow/80';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all
          ${open
            ? 'bg-neo-yellow text-black'
            : isDark
              ? 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              : 'text-slate-700 hover:text-black hover:bg-slate-200/60'
          }`}
      >
        {label}
      </button>

      {open && (
        <div className={`absolute top-full left-0 mt-0.5 min-w-[220px] z-[200] border-2 border-black shadow-[6px_6px_0px_#000] ${menuBg} py-1`}>
          {entries.map((entry, idx) => {
            if ('separator' in entry && entry.separator) {
              return <div key={idx} className={`my-1 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`} />;
            }
            const item = entry as MenuItemDef;
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => { item.action(); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold text-left transition-colors ${itemHover}`}
              >
                <span className="flex items-center gap-2">
                  {Icon && <Icon size={13} />}
                  {item.label}
                </span>
                {item.shortcut && (
                  <span className={`text-[10px] font-mono px-1 py-0.5 border ${isDark ? 'border-slate-600 bg-slate-800 text-slate-400' : 'border-slate-300 bg-slate-100 text-slate-500'}`}>
                    {item.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const Navbar: React.FC<NavbarProps> = ({
  isDark,
  toggleTheme,
  activeFile,
  onFileCreate,
  onFileUpload,
  onOpenGitHub,
  onOpenCollab,
  onRunCode,
  onFormatCode,
  onToggleSidebar,
  onToggleTerminal,
  onOpenSearch,
  onOpenSettings,
  onOpenCommandPalette,
  isInRoom,
  isChatOpen,
  onToggleChat,
  onMobileMenu,
}) => {
  const headerBg = isDark ? 'bg-[#181C2A]' : 'bg-[#FFF9EA]';
  const borderColor = 'border-b-2 border-black';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  const fileMenuEntries: MenuEntry[] = [
    { label: 'New Snippet', shortcut: 'Ctrl+N', icon: FilePlus2, action: onFileCreate },
    { label: 'Upload File', shortcut: 'Ctrl+U', icon: Upload, action: onFileUpload },
    { label: 'Import from GitHub', icon: Github, action: onOpenGitHub },
    { separator: true },
    { label: 'Collab Room', icon: Users, action: onOpenCollab },
  ];

  const editMenuEntries: MenuEntry[] = [
    { label: 'Format Code', shortcut: 'Shift+Alt+F', icon: Sparkles, action: onFormatCode },
    { separator: true },
    { label: 'Find & Replace', shortcut: 'Ctrl+H', icon: Search, action: onOpenSearch },
    { label: 'Command Palette', shortcut: 'Ctrl+K', icon: Search, action: onOpenCommandPalette },
  ];

  const viewMenuEntries: MenuEntry[] = [
    { label: 'Toggle Sidebar', shortcut: 'Ctrl+B', icon: PanelRightClose, action: onToggleSidebar },
    { label: 'Toggle Terminal', shortcut: 'Ctrl+`', icon: Terminal, action: onToggleTerminal },
    { separator: true },
    { label: 'Settings', icon: Settings2, action: onOpenSettings },
    { separator: true },
    { label: `${isDark ? 'Light' : 'Dark'} Mode`, icon: isDark ? Sun : Moon, action: toggleTheme },
  ];

  const terminalMenuEntries: MenuEntry[] = [
    { label: 'Run Code', shortcut: 'F5', icon: Play, action: onRunCode },
    { separator: true },
    { label: 'Toggle Terminal', shortcut: 'Ctrl+`', icon: Terminal, action: onToggleTerminal },
  ];

  const helpMenuEntries: MenuEntry[] = [
    { label: 'Command Palette', shortcut: 'Ctrl+K', icon: Keyboard, action: onOpenCommandPalette },
    { separator: true },
    { label: 'About CodeCollab', icon: HelpCircle, action: () => window.open('https://github.com', '_blank') },
  ];

  return (
    <header className={`shrink-0 ${headerBg} ${borderColor} z-20`}>
      {/* Main navbar row */}
      <div className="flex items-center h-12 px-2 gap-1">
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenu}
          className={`md:hidden p-1.5 border-2 border-black shadow-neo-sm transition-all active:translate-x-0.5 active:translate-y-0.5 ${isDark ? 'bg-neo-purple text-black' : 'bg-neo-yellow text-black'}`}
          aria-label="Open Sidebar"
        >
          <Menu size={18} />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 mr-2 pl-1">
          <img src="/CodeCollab-logo.png" alt="CodeCollab Logo" className="w-7 h-7 object-contain" />
          <span className={`hidden sm:inline font-black tracking-tight quantico-font text-[20px] ${textPrimary} select-none drop-shadow-[2px_2px_0px_#000]`}>
            CodeCollab
          </span>
        </div>

        {/* Divider */}
        <div className={`hidden md:block h-6 w-px mx-1 ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />

        {/* Menu bar — hidden on mobile */}
        <nav className="hidden md:flex items-center">
          <DropdownMenu label="File" entries={fileMenuEntries} isDark={isDark} />
          <DropdownMenu label="Edit" entries={editMenuEntries} isDark={isDark} />
          <DropdownMenu label="View" entries={viewMenuEntries} isDark={isDark} />
          <DropdownMenu label="Terminal" entries={terminalMenuEntries} isDark={isDark} />
          <DropdownMenu label="Help" entries={helpMenuEntries} isDark={isDark} />
        </nav>

        {/* Breadcrumb (center) */}
        <div className="flex-1 flex items-center justify-center px-2">
          {activeFile ? (
            <div className={`hidden md:flex items-center gap-1 text-[11px] font-bold ${textMuted} select-none`}>
              <FileCode size={11} className="text-neo-purple" />
              <span>workspace</span>
              <ChevronRight size={10} />
              <span className={`${textPrimary} font-black`}>{activeFile.name}</span>
              {activeFile.language && (
                <>
                  <ChevronRight size={10} />
                  <span className="neo-badge bg-neo-green text-black px-1.5 py-0.5 text-[9px]">
                    {activeFile.language.toUpperCase()}
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1">
              {/* Command Palette quick-launch */}
              <button
                onClick={onOpenCommandPalette}
                className={`flex items-center gap-2 px-3 py-1 border-2 border-black shadow-neo-sm text-xs font-black transition-all hover:bg-neo-yellow hover:text-black active:translate-x-0.5 active:translate-y-0.5 ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-black'}`}
              >
                <Search size={12} />
                <span>Search / Commands</span>
                <span className="neo-badge bg-neo-yellow text-black text-[9px] px-1.5">Ctrl+K</span>
              </button>
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {/* Run button (when file is open) */}
          {activeFile && (
            <button
              onClick={onRunCode}
              className="flex items-center gap-1 px-2.5 py-1.5 border-2 border-black bg-neo-green text-black font-black text-[10px] uppercase shadow-neo-sm hover:bg-neo-yellow transition-all active:translate-x-0.5 active:translate-y-0.5"
              title="Run Code (F5)"
            >
              <Play size={13} className="fill-black" />
              <span className="hidden sm:inline">Run</span>
            </button>
          )}

          {/* Chat button (when in room) */}
          {isInRoom && (
            <button
              onClick={onToggleChat}
              className={`flex items-center justify-center gap-1 px-2.5 py-1.5 border-2 border-black font-bold text-[10px] shadow-neo-sm transition-all active:translate-x-0.5 active:translate-y-0.5
                ${isChatOpen ? 'bg-neo-pink text-black' : 'bg-neo-blue text-black hover:bg-neo-purple'}`}
              title={isChatOpen ? 'Close Chat' : 'Open Chat'}
            >
              {isChatOpen ? <PanelRightClose size={14} /> : <MessageSquare size={14} />}
              <span className="hidden sm:inline uppercase font-black text-[10px]">Chat</span>
            </button>
          )}

          {/* Collab button (when not in room) */}
          {!isInRoom && (
            <button
              onClick={onOpenCollab}
              className="flex items-center gap-1 px-2.5 py-1.5 neo-btn bg-neo-purple text-black text-[10px] font-black uppercase tracking-wide"
            >
              <Users size={13} /> <span className="hidden sm:inline">Collab</span>
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="relative flex items-center justify-center w-8 h-8 border-2 border-black bg-neo-yellow text-black shadow-neo-sm font-black transition-all hover:bg-neo-purple active:translate-x-0.5 active:translate-y-0.5"
            aria-label="Toggle Theme"
          >
            <Sun size={15} className={`absolute transition-all duration-300 ${isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`} />
            <Moon size={15} className={`absolute transition-all duration-300 ${isDark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`} />
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center justify-center w-8 h-8 border-2 border-black shadow-neo-sm transition-all hover:bg-neo-yellow active:translate-x-0.5 active:translate-y-0.5 ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-black'}`}
            aria-label="Settings"
          >
            <Settings2 size={15} />
          </button>
        </div>
      </div>
    </header>
  );
};
