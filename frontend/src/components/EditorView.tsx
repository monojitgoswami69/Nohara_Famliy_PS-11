import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ModernMonacoEditor } from './ModernMonacoEditor';
import { CollabMonacoEditor } from './CollabMonacoEditor';
import { FileExplorer } from './FileExplorer';
import { CollabBar } from './CollabBar';
import { StoredFile } from '../services/storageService';
import { SharedFileInfo } from '../services/collabService';
import { useTheme } from '../hooks/useTheme';
import { detectLanguage, detectLanguageAI } from '../utils/detectLanguage';
import {
  FileCode, Plus, Upload, Code2, FolderOpen, Sun, Moon, Github, Users, X
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

interface CollabHook {
  status: import('../services/collabService').CollabStatus;
  roomId: string | null;
  isHost: boolean;
  displayName: string;
  color: string;
  members: import('../services/collabService').CollabMember[];
  pending: import('../services/collabService').PendingRequest[];
  sharedFiles: SharedFileInfo[];
  provider: import('../services/collabService').CollabProvider | null;
  toasts: import('../hooks/useCollabRoom').CollabToast[];
  leaveRoom: () => void;
  approveJoin: (peerId: string) => void;
  rejectJoin: (peerId: string) => void;
  shareFile: (file: { id: string; name: string; language: string; content: string }) => void;
  unshareFile: (fileId: string) => void;
  dismissToast: (id: string) => void;
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
  onOpenCollab: () => void;
  onRepoDelete?: (repoKey: string) => void;
  collab: CollabHook;
}

export const EditorView: React.FC<EditorViewProps> = ({
  files, activeFileId, loadingFileId, onFileSelect, onFileCreate, onFileDelete, onFileUpload,
  onCodeChange, onLanguageChange, onOpenGitHub, onOpenCollab, onRepoDelete, collab,
}) => {
  const { isDark, toggleTheme } = useTheme();

  // Look up active file from local files OR collab shared files (for clients)
  const activeFile = useMemo((): StoredFile | null => {
    if (!activeFileId) return null;
    const local = files.find(f => f.id === activeFileId);
    if (local) return local;
    // Client may not have the file locally — create synthetic entry from collab metadata
    const shared = collab.sharedFiles.find(f => f.id === activeFileId);
    if (shared) {
      return {
        id: shared.id,
        name: shared.name,
        language: shared.language,
        content: '', // Content comes from Y.Doc via CollabMonacoEditor
        contentHash: '',
        lastModified: Date.now(),
      } as StoredFile;
    }
    return null;
  }, [activeFileId, files, collab.sharedFiles]);

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

  // Detect language
  useEffect(() => {
    if (!activeFile || activeFile.language) return;
    const syncLang = detectLanguage(activeFile.name, activeFile.content);
    if (syncLang) onLanguageChange(activeFile.id, syncLang);
    if (activeFile.content && activeFile.content.trim().length > 20) {
      detectLanguageAI(activeFile.name, activeFile.content).then(aiLang => {
        if (aiLang && aiLang !== syncLang) onLanguageChange(activeFile.id, aiLang);
      });
    }
  }, [activeFile?.id, activeFile?.language, activeFile?.name, activeFile?.content, onLanguageChange]);

  useEffect(() => {
    localStorage.setItem('editor-font-size', fontSize.toString());
  }, [fontSize]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Collab state ─────────────────────────────────────────────────────

  const isInRoom = collab.status === 'connected' || collab.status === 'waiting-approval' || collab.status === 'connecting';
  const sharedFileIds = useMemo(
    () => new Set(collab.sharedFiles.map(f => f.id)),
    [collab.sharedFiles],
  );

  // Is the active file a shared (collab) file?
  const isActiveFileShared = activeFileId ? sharedFileIds.has(activeFileId) : false;

  // Build collabFileContents map — shared file data for the explorer
  const collabFileContents = useMemo(() => {
    const m = new Map<string, StoredFile>();
    for (const sf of collab.sharedFiles) {
      const local = files.find(f => f.id === sf.id);
      if (local) m.set(sf.id, local);
    }
    return m;
  }, [collab.sharedFiles, files]);

  // ── Host: add file to collab ─────────────────────────────────────────

  const handleAddToCollab = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    collab.shareFile({
      id: file.id,
      name: file.name,
      language: file.language,
      content: file.content,
    });
  };

  // ── Host: remove file from collab ────────────────────────────────────

  const handleRemoveFromCollab = (fileId: string) => {
    collab.unshareFile(fileId);
  };

  // ── Select a collab file ─────────────────────────────────────────────

  const handleSelectCollabFile = (fileId: string) => {
    // If this client already has the file locally, just select it
    const localFile = files.find(f => f.id === fileId);
    if (localFile) {
      onFileSelect(fileId);
    } else {
      // For clients: we need to select it (file will be in sharedFiles list)
      onFileSelect(fileId);
    }
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
            CODECOLLAB
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isInRoom && (
            <button
              onClick={onOpenCollab}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#CAA4F7]/15 hover:bg-[#CAA4F7]/25 text-[#CAA4F7] text-xs font-bold transition-all active:scale-95 border border-[#CAA4F7]/20"
            >
              <Users size={14} /> Collab
            </button>
          )}

          <button onClick={toggleTheme} className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'}`}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className={`w-64 flex flex-col ${bg}`}>
          <div className="px-2 pt-4 pb-2 space-y-2">
            <div className="flex gap-2">
              <button onClick={onFileCreate} className="flex-1 flex items-center justify-center gap-2 bg-[#CAA4F7] hover:bg-[#D4B5F9] text-[#1E1E2A] py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95">
                <Plus size={14} /> New Snippet
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center px-3 rounded-lg bg-[#CAA4F7]/20 hover:bg-[#CAA4F7]/30 text-[#CAA4F7] border border-[#CAA4F7]/30 transition-all active:scale-95 shadow-sm" title="Upload File">
                <Upload size={14} />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".js,.ts,.jsx,.tsx,.py,.cpp,.c,.java,.go,.rs,.rb,.php" onChange={handleFileUpload} />
            </div>
            <button onClick={onOpenGitHub}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all border ${isDark ? 'bg-[#232340] hover:bg-[#2a2a50] text-slate-300 border-slate-700/50 hover:border-purple-500/50' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-300 hover:border-purple-400'} active:scale-[0.98] shadow-sm`}>
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
                isInRoom={isInRoom}
                isHost={collab.isHost}
                sharedFiles={collab.sharedFiles}
                collabFileContents={collabFileContents}
                onAddToCollab={handleAddToCollab}
                onRemoveFromCollab={handleRemoveFromCollab}
                onSelectCollabFile={handleSelectCollabFile}
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
              {/* Waiting overlay */}
              {collab.status === 'waiting-approval' && (
                <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center ${isDark ? 'bg-[#1e1e2e]/90' : 'bg-[#eff1f5]/90'} backdrop-blur-sm`}>
                  <div className="mb-4">
                    <Users size={32} className="text-[#CAA4F7]" />
                  </div>
                  <p className={`text-sm font-medium ${textPrimary}`}>Waiting for host approval...</p>
                  <p className={`text-xs mt-1 ${textMuted}`}>The room host will accept or reject your request.</p>
                  <button
                    onClick={collab.leaveRoom}
                    className="mt-4 px-4 py-2 rounded-lg bg-red-500/15 text-red-400 text-xs font-bold hover:bg-red-500/25 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Collab editor for shared files, standard editor otherwise */}
              {isActiveFileShared && collab.provider && collab.status === 'connected' ? (
                <CollabMonacoEditor
                  file={activeFile}
                  theme={isDark ? 'dark' : 'light'}
                  fontSize={fontSize}
                  provider={collab.provider}
                  onChange={(code) => onCodeChange(activeFile.id, code)}
                  onCursorChange={(ln, col) => setCursorPosition({ ln, col })}
                  onSelectionChange={(count) => setSelectionCount(count)}
                />
              ) : (
                <ModernMonacoEditor
                  file={activeFile}
                  theme={isDark ? 'dark' : 'light'}
                  fontSize={fontSize}
                  onChange={(code) => onCodeChange(activeFile.id, code)}
                  onCursorChange={(ln, col) => setCursorPosition({ ln, col })}
                  onSelectionChange={(count) => setSelectionCount(count)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
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

      {/* Collab bar */}
      {isInRoom && collab.roomId && (
        <CollabBar
          roomId={collab.roomId}
          status={collab.status}
          isHost={collab.isHost}
          members={collab.members}
          pending={collab.pending}
          toasts={collab.toasts}
          onApprove={collab.approveJoin}
          onReject={collab.rejectJoin}
          onLeave={collab.leaveRoom}
          onDismissToast={collab.dismissToast}
        />
      )}

      {/* Collab toasts — always rendered so rejection/error toasts are visible */}
      {collab.toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
          {collab.toasts.map(toast => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium animate-fade-in-up ${
                toast.type === 'error' ? 'bg-red-500/90 text-white' :
                toast.type === 'success' ? 'bg-green-500/90 text-white' :
                toast.type === 'warning' ? 'bg-amber-500/90 text-white' :
                isDark ? 'bg-[#2a2a50] text-white border border-slate-600/50' : 'bg-white text-slate-900 border border-slate-200 shadow-md'
              }`}
            >
              <span>{toast.message}</span>
              <button onClick={() => collab.dismissToast(toast.id)} className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
