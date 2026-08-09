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
  FileCode, Plus, Upload, Code2, FolderOpen, Sun, Moon, Github, Users, X, MessageSquare, PanelRightClose, Menu, Play, Sparkles, Search
} from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion';
import { EditorTabs } from './EditorTabs';
import { ExecutionTerminal } from './ExecutionTerminal';
import { CommandPalette } from './CommandPalette';
import { formatCode } from '../utils/codeFormatter';

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
  chatMessages: import('../services/collabService').ChatMessage[];
  peerId: string;
  leaveRoom: () => void;
  approveJoin: (peerId: string) => void;
  rejectJoin: (peerId: string) => void;
  shareFile: (file: { id: string; name: string; language: string; content: string }) => void;
  unshareFile: (fileId: string) => void;
  dismissToast: (id: string) => void;
  sendChatMessage: (text: string) => void;
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

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [openFileIds, setOpenFileIds] = useState<string[]>([]);
  const [cursorPosition, setCursorPosition] = useState({ ln: 1, col: 1 });
  const [selectionCount, setSelectionCount] = useState(0);

  // Global Ctrl+K / Ctrl+P listener in DOM Capture Phase
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isCmdOrCtrl && (key === 'k' || key === 'p')) {
        e.preventDefault();
        e.stopPropagation();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, []);


  const [fontSize] = useState(() => {
    const saved = localStorage.getItem('editor-font-size');
    return saved ? parseInt(saved, 10) : 16;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasInitializedTabs = useRef(false);

  // Sync open files with active file selection
  useEffect(() => {
    if (activeFileId && !openFileIds.includes(activeFileId)) {
      setOpenFileIds(prev => [...prev, activeFileId]);
    }
  }, [activeFileId, openFileIds]);

  // Initial one-time tab setup when files load
  useEffect(() => {
    if (!hasInitializedTabs.current && files.length > 0) {
      hasInitializedTabs.current = true;
      if (activeFileId) {
        setOpenFileIds([activeFileId]);
      }
    }
  }, [files, activeFileId]);

  const handleCloseTab = (fileId: string) => {
    const nextOpen = openFileIds.filter(id => id !== fileId);
    setOpenFileIds(nextOpen);
    if (activeFileId === fileId) {
      if (nextOpen.length > 0) {
        onFileSelect(nextOpen[nextOpen.length - 1]);
      } else {
        // Return to welcome screen when all tabs are closed
        onFileSelect('');
      }
    }
  };


  const handleFormatCode = () => {
    if (!activeFile) return;
    const formatted = formatCode(activeFile.content, activeFile.language);
    if (formatted !== activeFile.content) {
      onCodeChange(activeFile.id, formatted);
    }
  };

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
      <header className={`h-14 flex items-center justify-between px-4 ${isDark ? 'bg-[#181C2A]' : 'bg-[#FFF9EA]'} z-20 border-b-2.5 border-black shadow-neo-sm`}>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className={`md:hidden p-1.5 border-2 border-black rounded-none shadow-neo-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 ${isDark ? 'bg-neo-purple text-black' : 'bg-neo-yellow text-black'}`}
            aria-label="Open Sidebar"
          >
            <Menu size={20} />
          </button>
          <img src="/CodeCollab-logo.png" alt="CodeCollab Logo" className="w-8 h-8 sm:w-9 sm:h-9 object-contain" />
          <span className={`hidden sm:inline font-black tracking-tight quantico-font text-[24px] sm:text-[26px] ${textPrimary} select-none drop-shadow-[2px_2px_0px_#000]`}>
            CodeCollab
          </span>
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 border-2 border-black bg-white dark:bg-slate-800 text-black dark:text-white shadow-neo-sm font-black text-xs transition-all hover:bg-neo-yellow hover:text-black active:translate-x-0.5 active:translate-y-0.5 ml-2"
          >
            <Search size={14} className="text-black dark:text-white" />
            <span className="font-bold">Search / Commands</span>
            <span className="neo-badge bg-neo-yellow text-black text-[9px] px-1.5 py-0.2">Ctrl+K</span>
          </button>
          <button 
            onClick={toggleTheme} 
            className="relative flex items-center justify-center w-9 h-9 ml-2 border-2 border-black bg-neo-yellow text-black shadow-neo-sm font-black transition-all hover:bg-neo-purple active:translate-x-0.5 active:translate-y-0.5"
            aria-label="Toggle Theme"
          >
            <Sun 
              size={18} 
              className={`absolute transition-all duration-300 text-black ${isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`} 
            />
            <Moon 
              size={18} 
              className={`absolute transition-all duration-300 text-black ${isDark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`} 
            />
          </button>
        </div>


        <div className="flex items-center gap-2">
          {isInRoom && (
            <button
              onClick={() => setIsChatOpen(prev => !prev)}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 border-2 border-black shadow-neo-sm font-bold text-xs transition-all active:translate-x-0.5 active:translate-y-0.5 ${
                isChatOpen
                  ? 'bg-neo-pink text-black'
                  : 'bg-neo-blue text-black hover:bg-neo-purple'
              }`}
              title={isChatOpen ? 'Close Chat' : 'Open Chat'}
            >
              {isChatOpen ? <PanelRightClose size={16} /> : <MessageSquare size={16} />}
              <span className="hidden sm:inline">CHAT</span>
            </button>
          )}
          {!isInRoom && (
            <button
              onClick={onOpenCollab}
              className="flex items-center gap-1.5 px-3.5 py-1.5 neo-btn bg-neo-purple text-black text-xs font-black uppercase tracking-wider"
            >
              <Users size={15} /> Collab Room
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/60 md:hidden transition-opacity" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed md:relative inset-y-0 left-0 z-50 w-[280px] md:w-64 transform transition-transform duration-300 ease-in-out md:transform-none flex flex-col ${bg} border-r-2.5 border-black md:border-r-2.5
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className={`flex md:hidden items-center justify-between px-4 py-3 border-b-2 border-black bg-neo-yellow text-black font-black`}>
            <span className="uppercase tracking-wider">Snippets & Files</span>
            <button onClick={() => setIsSidebarOpen(false)} className="p-1 border-1.5 border-black bg-neo-pink text-black hover:bg-red-400 font-bold">
              <X size={18} />
            </button>
          </div>
          <div className="px-3 pt-3 pb-2 space-y-2">
            <div className="flex gap-2">
              <button onClick={onFileCreate} className="flex-1 flex items-center justify-center gap-1.5 bg-neo-green hover:bg-neo-yellow text-black py-2.5 px-3 border-2 border-black shadow-neo-sm text-xs font-black uppercase tracking-wide transition-all active:translate-x-0.5 active:translate-y-0.5">
                <Plus size={16} className="text-black" /> New Snippet
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center px-3 py-2.5 bg-neo-blue hover:bg-neo-purple text-black border-2 border-black shadow-neo-sm transition-all active:translate-x-0.5 active:translate-y-0.5" title="Upload File">
                <Upload size={16} className="text-black" />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".js,.ts,.jsx,.tsx,.py,.cpp,.c,.java,.go,.rs,.rb,.php" onChange={handleFileUpload} />
            </div>
            <button onClick={onOpenGitHub}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-neo-purple hover:bg-neo-yellow text-black border-2 border-black shadow-neo-sm text-xs font-black uppercase tracking-wide transition-all active:translate-x-0.5 active:translate-y-0.5">
              <Github size={16} className="text-black" /> Import from GitHub
            </button>
          </div>


          <div className="flex-1 overflow-y-auto px-2 pb-2 custom-scrollbar">
            {files.length === 0 && !(isInRoom && collab.sharedFiles.length > 0) ? (
              <div className={`flex flex-col items-center justify-center h-full py-8 text-black/60 dark:text-white/60 font-bold`}>
                <FolderOpen size={32} className="mb-2 opacity-70" />
                <p className="text-xs text-center uppercase tracking-wide">No Snippets Yet</p>
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
            <div className={`flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto custom-scrollbar ${bgEditor}`}>
              <div className="max-w-3xl w-full space-y-5">
                
                {/* Windowed Header Frame */}
                <div className="border-3 border-black bg-white dark:bg-[#181C2A] shadow-neo-xl overflow-hidden text-left">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-neo-yellow text-black border-b-2.5 border-black font-black">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black inline-block" />
                        <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black inline-block" />
                        <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-black inline-block" />
                      </div>
                      <span className="text-xs font-mono tracking-wider uppercase ml-2">codecollab.workspace // v3.0</span>
                    </div>
                    <span className="neo-badge bg-neo-green text-black px-2 py-0.5 text-[9px]">
                      ● LIVE SYNC
                    </span>
                  </div>

                  <div className="p-6 md:p-8 space-y-4">
                    <div className="inline-flex items-center gap-2 neo-badge bg-neo-purple text-black px-3 py-1 text-xs">
                      <span>🚀 NEOBRUTALISM BENTO TEMPLATE</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-black dark:text-white drop-shadow-[3px_3px_0px_#000]">
                      REAL-TIME COLLABORATIVE CODE EDITOR
                    </h1>
                    <p className="text-sm md:text-base font-bold text-slate-700 dark:text-slate-300 max-w-2xl leading-relaxed">
                      Zero-install browser IDE powered by Yjs CRDTs, Monaco Editor, FastAPI REST server, and dual-channel WebSockets.
                    </p>
                  </div>
                </div>

                {/* Neobrutalism Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  
                  {/* Bento Tile 1: New Snippet */}
                  <button
                    onClick={onFileCreate}
                    className="p-5 border-3 border-black bg-neo-green text-black shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all active:translate-x-1 active:translate-y-1 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className="w-9 h-9 border-2 border-black bg-white text-black flex items-center justify-center font-black shadow-neo-sm">
                        <Plus size={20} className="text-black" />
                      </div>
                      <span className="neo-badge bg-white text-black px-2 py-0.5 text-[9px] font-black">INSTANT</span>
                    </div>
                    <div>
                      <h3 className="font-black text-base uppercase text-black">New Snippet</h3>
                      <p className="text-xs font-bold text-black opacity-90 mt-1">Create a fresh scratchpad with syntax highlighting</p>
                    </div>
                  </button>

                  {/* Bento Tile 2: Host Room */}
                  <button
                    onClick={onOpenCollab}
                    className="p-5 border-3 border-black bg-neo-yellow text-black shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all active:translate-x-1 active:translate-y-1 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className="w-9 h-9 border-2 border-black bg-white text-black flex items-center justify-center font-black shadow-neo-sm">
                        <Users size={20} className="text-black" />
                      </div>
                      <span className="neo-badge bg-white text-black px-2 py-0.5 text-[9px] font-black">MULTIPLAYER</span>
                    </div>
                    <div>
                      <h3 className="font-black text-base uppercase text-black">Host Room</h3>
                      <p className="text-xs font-bold text-black opacity-90 mt-1">Generate 6-character room invite code</p>
                    </div>
                  </button>

                  {/* Bento Tile 3: GitHub Import */}
                  <button
                    onClick={onOpenGitHub}
                    className="p-5 border-3 border-black bg-neo-purple text-black shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all active:translate-x-1 active:translate-y-1 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className="w-9 h-9 border-2 border-black bg-white text-black flex items-center justify-center font-black shadow-neo-sm">
                        <Github size={20} className="text-black" />
                      </div>
                      <span className="neo-badge bg-white text-black px-2 py-0.5 text-[9px] font-black">OAUTH 2.0</span>
                    </div>
                    <div>
                      <h3 className="font-black text-base uppercase text-black">Import Repo</h3>
                      <p className="text-xs font-bold text-black opacity-90 mt-1">Fetch files directly from public or private repos</p>
                    </div>
                  </button>
                </div>

                {/* Tech Stack Bento Banner */}
                <div className="border-3 border-black bg-neo-blue text-black p-5 shadow-neo text-left">
                  <h3 className="text-xs font-black uppercase tracking-wider mb-3 text-black">
                    ⚡ ARCHITECTURE & TECH STACK HIGHLIGHTS
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 border-2 border-black bg-white text-black font-bold text-xs shadow-neo-sm">
                      <div className="font-black text-black text-sm">Yjs CRDTs</div>
                      <div className="text-[11px] font-bold text-slate-800">Zero-conflict syncing</div>
                    </div>
                    <div className="p-3 border-2 border-black bg-white text-black font-bold text-xs shadow-neo-sm">
                      <div className="font-black text-black text-sm">Monaco Engine</div>
                      <div className="text-[11px] font-bold text-slate-800">50+ languages</div>
                    </div>
                    <div className="p-3 border-2 border-black bg-white text-black font-bold text-xs shadow-neo-sm">
                      <div className="font-black text-black text-sm">Node WebSocket</div>
                      <div className="text-[11px] font-bold text-slate-800">Dual channel ws</div>
                    </div>
                    <div className="p-3 border-2 border-black bg-white text-black font-bold text-xs shadow-neo-sm">
                      <div className="font-black text-black text-sm">FastAPI REST</div>
                      <div className="text-[11px] font-bold text-slate-800">GitHub OAuth</div>
                    </div>
                  </div>
                </div>


                {/* Neo Brutalism Accordion Tile */}
                <div className="border-3 border-black bg-white dark:bg-[#181C2A] p-5 shadow-neo text-left">
                  <h3 className="text-xs font-black uppercase tracking-wider text-black dark:text-white mb-3">
                    Frequently Asked Questions
                  </h3>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>How does real-time document sync work?</AccordionTrigger>
                      <AccordionContent>
                        CodeCollab uses <strong>Yjs CRDTs</strong> (Conflict-free Replicated Data Types) over a binary WebSocket channel (`/doc/:roomId/:fileId`). Every edit updates local state and broadcasts deltas deterministically.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>How do I invite teammates?</AccordionTrigger>
                      <AccordionContent>
                        Click <strong>Collab Room</strong>, enter your display name, and copy the generated 6-character room code. Share it with your team so they can send join requests.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>Is my code secure?</AccordionTrigger>
                      <AccordionContent>
                        All room session state lives in memory on the collaboration server for the session duration. Nothing is logged to external databases.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
              {/* Multi-Tab File Editor Navigation */}
              <EditorTabs
                files={files}
                openFileIds={openFileIds}
                activeFileId={activeFileId}
                onSelectTab={onFileSelect}
                onCloseTab={handleCloseTab}
                onNewTab={onFileCreate}
                isDark={isDark}
              />

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
              <div className="flex-1 min-h-0 relative">
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

              {/* In-Browser Execution Terminal */}
              <ExecutionTerminal
                file={activeFile}
                isOpen={isTerminalOpen}
                onClose={() => setIsTerminalOpen(false)}
                isDark={isDark}
              />
            </div>
          )}
        </div>

        {/* Chat side panel — flexes alongside editor */}
        {isInRoom && (
          <ChatPanel
            isOpen={isChatOpen}
            messages={collab.chatMessages}
            selfPeerId={collab.peerId}
            onSendMessage={collab.sendChatMessage}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </div>

      {/* Status bar */}
      <div className={`h-9 flex items-center justify-between px-2 sm:px-4 text-[10px] sm:text-[12px] kode-font font-black border-t-2.5 border-black ${isDark ? 'bg-[#181C2A] text-neo-yellow' : 'bg-[#FFF9EA] text-black'} relative`}>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 h-4">
            <FileCode size={14} className="hidden sm:block" />
            <span>{files.length} FILES</span>
          </div>
          {activeFile && (
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 h-6 transition-colors font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <LanguageIcon language={activeFile.language} size={14} colorOverride="text-current" />
                <span className="neo-badge bg-neo-green text-black px-1.5 py-0.5 text-[9px]">{activeFile.language ? activeFile.language.toUpperCase() : 'AUTO DETECTING...'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar Advanced Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {activeFile && (
            <>
              <button
                onClick={handleFormatCode}
                className="flex items-center gap-1 px-2 py-0.5 border-1.5 border-black bg-neo-purple text-black font-black text-[10px] uppercase shadow-neo-sm hover:bg-neo-yellow transition-all active:translate-x-0.5 active:translate-y-0.5"
                title="Format Code (Shift+Alt+F)"
              >
                <Sparkles size={11} /> FORMAT
              </button>

              <button
                onClick={() => setIsTerminalOpen(prev => !prev)}
                className={`flex items-center gap-1 px-2 py-0.5 border-1.5 border-black font-black text-[10px] uppercase shadow-neo-sm transition-all active:translate-x-0.5 active:translate-y-0.5 ${
                  isTerminalOpen ? 'bg-neo-pink text-black' : 'bg-neo-green text-black hover:bg-neo-yellow'
                }`}
                title="Toggle Code Execution Terminal"
              >
                <Play size={11} className="fill-black" /> RUN CODE
              </button>

              <div className="flex items-center gap-1.5 h-4 font-bold hidden md:flex">
                <Code2 size={14} />
                <span>LN {cursorPosition.ln}, COL {cursorPosition.col} {selectionCount > 0 && `(${selectionCount} selected)`}</span>
              </div>
            </>
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
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 min-w-[280px] max-w-[400px] rounded-md shadow-lg text-[12px] font-medium transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                toast.exiting ? 'opacity-0 translate-x-4 scale-100' : 'animate-[slideInRight_0.35s_cubic-bezier(0.2,0.8,0.2,1)_forwards] opacity-100 translate-x-0 scale-100'
              } ${
                toast.type === 'error' ? 'bg-[#bf616a] text-[#eceff4] border border-[#bf616a]/50' :
                toast.type === 'success' ? 'bg-[#a3be8c] text-[#2e3440] border border-[#a3be8c]/50' :
                toast.type === 'warning' ? 'bg-[#ebcb8b] text-[#2e3440] border border-[#ebcb8b]/50' :
                isDark ? 'bg-[#3b4252] text-[#eceff4] border border-[#4c566a]' : 'bg-[#eceff4] text-[#2e3440] border border-[#d8dee9]'
              }`}
            >
              <span className="flex-1 leading-snug">{toast.message}</span>
              <button 
                onClick={() => collab.dismissToast(toast.id)} 
                className="shrink-0 ml-2 opacity-60 hover:opacity-100 transition-all p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Command Palette Modal (Ctrl+K) */}

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        files={files}
        activeFileId={activeFileId}
        onSelectFile={onFileSelect}
        onFileCreate={onFileCreate}
        onUploadFile={() => fileInputRef.current?.click()}
        onFormatCode={handleFormatCode}
        onRunCode={() => setIsTerminalOpen(true)}
        onOpenCollab={onOpenCollab}
        onOpenGitHub={onOpenGitHub}
        onToggleTheme={toggleTheme}
      />


    </div>
  );
};

