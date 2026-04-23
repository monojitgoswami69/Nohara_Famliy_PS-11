import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ModernMonacoEditor } from './ModernMonacoEditor';
import { FileExplorer } from './FileExplorer';
import { StoredFile } from '../services/storageService';
import { useTheme } from '../hooks/useTheme';
import { VERSION } from '../constants';
import { detectLanguage } from '../utils/detectLanguage';
import {
  FileCode, Plus, Upload, Code2, FolderOpen, Sun, Moon, Github
} from 'lucide-react';
import {
  JavaScript, TypeScript, Python, CPlusPlus, C, Java, Go, RustDark, Ruby, PHP
} from 'developer-icons';

const langIconMap: Record<string, { icon: any }> = {
  JavaScript: { icon: JavaScript },
  TypeScript: { icon: TypeScript },
  Python: { icon: Python },
  'C++': { icon: CPlusPlus },
  C: { icon: C },
  Java: { icon: Java },
  Go: { icon: Go },
  Rust: { icon: RustDark },
  Ruby: { icon: Ruby },
  PHP: { icon: PHP },
};

function LanguageIcon({ language, size = 16, className = '', colorOverride }: { language: string; size?: number; className?: string; colorOverride?: string }) {
  const entry = langIconMap[language];
  if (!entry) return <FileCode size={size} className={className} />;
  const Icon = entry.icon;
  return (
    <div className={className} style={{ display: 'inline-flex', alignItems: 'center' }}>
      <Icon size={size} color={colorOverride ? 'currentColor' : undefined} />
    </div>
  );
}

interface EditorViewProps {
  files: StoredFile[];
  activeFileId: string | null;
  loadingFileId: string | null;
  onFileSelect: (id: string) => void;
  onFileCreate: () => void;
  onFileDelete: (id: string) => void;
  onFileUpload: (file: File) => void;
  onCodeChange: (id: string, newCode: string) => void;
  onLanguageChange: (id: string, language: string) => void;
  onOpenGitHub: () => void;
  onRepoDelete?: (repoKey: string) => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  files, activeFileId, loadingFileId, onFileSelect, onFileCreate, onFileDelete, onFileUpload,
  onCodeChange, onLanguageChange, onOpenGitHub, onRepoDelete,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const activeFile = activeFileId ? files.find(f => f.id === activeFileId) : null;

  const [cursorPosition, setCursorPosition] = useState({ ln: 1, col: 1 });
  const [selectionCount, setSelectionCount] = useState(0);
  const [fontSize] = useState(() => {
    const saved = localStorage.getItem('editor-font-size');
    return saved ? parseInt(saved, 10) : 16;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCursorPosition({ ln: 1, col: 1 });
    setSelectionCount(0);
  }, [activeFileId]);

  const detectedLanguage = useMemo(() => {
    if (!activeFile) return '';
    return detectLanguage(activeFile.name, activeFile.content);
  }, [activeFile?.name, activeFile?.content]);

  useEffect(() => {
    if (activeFile && !activeFile.language && detectedLanguage) {
      onLanguageChange(activeFile.id, detectedLanguage);
    }
  }, [detectedLanguage, activeFile, onLanguageChange]);

  useEffect(() => {
    localStorage.setItem('editor-font-size', fontSize.toString());
  }, [fontSize]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const bg = isDark ? 'bg-[#1E1E2A]' : 'bg-[#E5E8EE]';
  const bgEditor = isDark ? 'bg-[#232332]' : 'bg-[#EEF1F5]';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';

  return (
    <div className={`flex flex-col h-screen ${bg} text-slate-300 overflow-hidden`}>
      <header className={`h-14 flex items-center justify-between px-4 ${isDark ? 'bg-[#181821]' : 'bg-[#DBDFE7]'} z-20 shadow-sm border-b ${isDark ? 'border-slate-800/50' : 'border-slate-300/50'}`}>
        <div className="flex items-center gap-3">
          <span className={`font-black tracking-tighter kode-font text-[28px] ${textPrimary} select-none`}>
            CODECOLLAB<span className="text-blue-500 text-[14px] font-mono ml-2 opacity-70">// v{VERSION}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'}`}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className={`w-64 flex flex-col ${bg}`}>
          <div className="px-2 pt-4 pb-2">
            <div className="flex gap-2">
              <button onClick={onFileCreate} className="flex-1 flex items-center justify-center gap-2 bg-[#CAA4F7] hover:bg-[#D4B5F9] text-[#1E1E2A] py-2 rounded text-xs font-medium transition-colors shadow-sm">
                <Plus size={14} /> New Snippet
              </button>
              <button onClick={() => fileInputRef.current?.click()} className={`flex items-center justify-center p-2 rounded border transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'}`}>
                <Upload size={14} />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".js,.ts,.jsx,.tsx,.py,.cpp,.c,.java,.go,.rs,.rb,.php" onChange={handleFileUpload} />
            </div>
            <button onClick={onOpenGitHub}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-medium transition-all border ${isDark ? 'bg-[#232340] hover:bg-[#2a2a50] text-slate-300 border-slate-700/50 hover:border-purple-500/50' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300 hover:border-purple-400'}`}>
              <Github size={14} /> Import from GitHub
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2 custom-scrollbar">
            {files.length === 0 ? (
              <div className={`flex flex-col items-center justify-center h-full py-8 ${textMuted}`}>
                <FolderOpen size={28} className="mb-3 opacity-50" />
                <p className="text-xs text-center">No snippets yet</p>
              </div>
            ) : (
              <FileExplorer
                files={files}
                activeFileId={activeFileId}
                loadingFileId={loadingFileId}
                onFileSelect={onFileSelect}
                onFileDelete={onFileDelete}
                onRepoDelete={onRepoDelete}
              />
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {!activeFile ? (
            <div className={`flex-1 flex flex-col items-center justify-center ${bgEditor}`}>
              <div className="text-center max-w-md px-8">
                <FolderOpen size={48} className={`mx-auto mb-8 ${isDark ? 'text-blue-400/50' : 'text-blue-500/50'}`} />
                <h2 className={`text-xl font-semibold mb-2 ${textPrimary}`}>Welcome to CodeCollab</h2>
                <div className="flex gap-4 justify-center">
                  <button onClick={onFileCreate} className="flex items-center gap-2 px-6 py-3 bg-[#CAA4F7] hover:bg-[#D4B5F9] text-[#1E1E2A] rounded-lg text-sm font-medium transition-colors shadow-md">
                    <Plus size={18} /> New Snippet
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 relative overflow-hidden">
              <ModernMonacoEditor
                file={activeFile}
                theme={isDark ? 'dark' : 'light'}
                fontSize={fontSize}
                onChange={(code) => onCodeChange(activeFile.id, code)}
                onCursorChange={(ln, col) => setCursorPosition({ ln, col })}
                onSelectionChange={(count) => setSelectionCount(count)}
              />
            </div>
          )}
        </div>
      </div>

      <div className={`h-8 flex items-center justify-between px-2 text-[12px] kode-font font-black ${isDark ? 'bg-[#181821] text-white/70' : 'bg-[#DBDFE7] text-slate-500/30'} relative`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 h-4">
            <FileCode size={14} />
            <span>{files.length} FILES</span>
          </div>
          {activeFile && (
            <div className="flex items-center animate-fade-in">
              <div className={`flex items-center gap-2 h-6 transition-colors ${isDark ? 'text-white/70' : 'text-slate-500/30'}`}>
                <LanguageIcon language={activeFile.language} size={14} colorOverride="text-current opacity-70" />
                <span>{activeFile.language ? activeFile.language.toUpperCase() : 'AUTO DETECTING...'}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeFile && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 h-4">
                <Code2 size={14} />
                <span>LN {cursorPosition.ln}, COL {cursorPosition.col} {selectionCount > 0 && `(${selectionCount} selected)`}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
