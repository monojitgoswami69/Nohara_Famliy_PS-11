import React, { useState, useEffect } from 'react';
import { Search, Play, Sparkles, Plus, Upload, Github, Users, SunMoon, X, FileCode } from 'lucide-react';
import { StoredFile } from '../services/storageService';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  files: StoredFile[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onFileCreate: () => void;
  onUploadFile: () => void;
  onFormatCode: () => void;
  onRunCode: () => void;
  onOpenCollab: () => void;
  onOpenGitHub: () => void;
  onToggleTheme: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  files,
  activeFileId,
  onSelectFile,
  onFileCreate,
  onUploadFile,
  onFormatCode,
  onRunCode,
  onOpenCollab,
  onOpenGitHub,
  onToggleTheme,
}) => {
  const [query, setQuery] = useState('');

  // Reset query on open
  useEffect(() => {
    if (isOpen) setQuery('');
  }, [isOpen]);

  // Handle Escape keyboard shortcut to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'run-code',
      title: 'Run Snippet (Live Terminal)',
      subtitle: 'Execute current code snippet in output console',
      badge: 'RUN',
      bgHover: 'hover:bg-neo-green',
      icon: <Play size={16} className="text-black" />,
      handler: () => { onRunCode(); onClose(); }
    },
    {
      id: 'format-code',
      title: 'Format Code (Prettier)',
      subtitle: 'Beautify indents, brackets & quotes',
      badge: 'ALT+F',
      bgHover: 'hover:bg-neo-purple',
      icon: <Sparkles size={16} className="text-black" />,
      handler: () => { onFormatCode(); onClose(); }
    },
    {
      id: 'create-file',
      title: 'Create New Snippet',
      subtitle: 'Open clean scratchpad workspace',
      badge: 'NEW',
      bgHover: 'hover:bg-neo-yellow',
      icon: <Plus size={16} className="text-black" />,
      handler: () => { onFileCreate(); onClose(); }
    },
    {
      id: 'upload-file',
      title: 'Upload Local File',
      subtitle: 'Import JS, TS, Py, HTML or CSS file',
      badge: 'UPLOAD',
      bgHover: 'hover:bg-neo-blue',
      icon: <Upload size={16} className="text-black" />,
      handler: () => { onUploadFile(); onClose(); }
    },
    {
      id: 'host-room',
      title: 'Host Multiplayer Collab Room',
      subtitle: 'Generate 6-character live room code',
      badge: 'ROOM',
      bgHover: 'hover:bg-neo-pink',
      icon: <Users size={16} className="text-black" />,
      handler: () => { onOpenCollab(); onClose(); }
    },
    {
      id: 'import-github',
      title: 'Import GitHub Repository',
      subtitle: 'Fetch files directly from GitHub URL',
      badge: 'GITHUB',
      bgHover: 'hover:bg-neo-purple',
      icon: <Github size={16} className="text-black" />,
      handler: () => { onOpenGitHub(); onClose(); }
    },
    {
      id: 'toggle-theme',
      title: 'Toggle Light / Dark Mode',
      subtitle: 'Switch application color palette',
      badge: 'THEME',
      bgHover: 'hover:bg-neo-yellow',
      icon: <SunMoon size={16} className="text-black" />,
      handler: () => { onToggleTheme(); onClose(); }
    },
  ];

  const filteredActions = actions.filter(action =>
    action.title.toLowerCase().includes(query.toLowerCase()) ||
    action.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(query.toLowerCase()) ||
    (f.language && f.language.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl border-3 border-black bg-white dark:bg-[#181C2A] shadow-[10px_10px_0px_#000] overflow-hidden text-black dark:text-white">
        
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b-2.5 border-black bg-neo-yellow text-black">
          <Search size={20} className="text-black shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search snippets or type command... (Ctrl+K / Ctrl+P)"
            className="w-full bg-transparent outline-none font-black text-sm text-black placeholder-slate-800 uppercase tracking-wide"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 border border-black bg-neo-pink text-black hover:bg-red-400 font-bold"
          >
            <X size={16} />
          </button>
        </div>

        {/* Command List & Search Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          
          {/* Quick Action Commands Section */}
          {filteredActions.length > 0 && (
            <>
              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Actions & Commands
              </div>
              {filteredActions.map(action => (
                <button
                  key={action.id}
                  onClick={action.handler}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 border-2 border-transparent hover:border-black ${action.bgHover} hover:text-black font-bold text-xs transition-all text-left group`}
                >
                  <div className="p-1 border border-black bg-white group-hover:bg-yellow-300">
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-black uppercase text-black dark:text-white group-hover:text-black">{action.title}</div>
                    <div className="text-[10px] opacity-90 text-slate-700 dark:text-slate-200 group-hover:text-black">{action.subtitle}</div>
                  </div>
                  <span className="neo-badge bg-black text-white group-hover:bg-white group-hover:text-black px-1.5 py-0.5 text-[8px] font-black">
                    {action.badge}
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Snippets / Files Results Section */}
          {filteredFiles.length > 0 && (
            <>
              <div className="px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Workspace Snippets ({filteredFiles.length})
              </div>
              {filteredFiles.map(file => (
                <button
                  key={file.id}
                  onClick={() => { onSelectFile(file.id); onClose(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 border-2 border-transparent hover:border-black hover:bg-neo-yellow hover:text-black font-bold text-xs transition-all text-left text-black dark:text-white ${
                    file.id === activeFileId ? 'bg-neo-yellow/30 font-black' : ''
                  }`}
                >
                  <FileCode size={15} className="text-neo-purple shrink-0" />
                  <span className="font-bold flex-1 truncate">{file.name}</span>
                  {file.id === activeFileId && (
                    <span className="neo-badge bg-neo-green text-black px-1 py-0.2 text-[8px]">ACTIVE</span>
                  )}
                  <span className="neo-badge bg-slate-200 dark:bg-slate-600 text-black dark:text-white px-1.5 py-0.5 text-[8px] uppercase">
                    {file.language || 'text'}
                  </span>
                </button>
              ))}
            </>
          )}

          {filteredActions.length === 0 && filteredFiles.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-600 dark:text-slate-300 font-bold">
              No matching commands or snippets found for "{query}"
            </div>
          )}

        </div>

        {/* Footer Shortcut Guide */}
        <div className="px-4 py-2 bg-slate-100 dark:bg-[#232340] border-t-2 border-black flex items-center justify-between text-[10px] font-bold text-slate-700 dark:text-slate-200">
          <span>PRESS <kbd className="px-1 py-0.5 bg-white dark:bg-slate-700 text-black dark:text-white border border-black font-black">ESC</kbd> TO CLOSE</span>
          <span>CODECOLLAB COMMAND PALETTE</span>
        </div>

      </div>
    </div>
  );
};
