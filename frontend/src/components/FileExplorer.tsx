import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StoredFile } from '../services/storageService';
import { SharedFileInfo } from '../services/collabService';
import { useTheme } from '../hooks/useTheme';
import {
  FileCode, FolderOpen, FolderClosed, ChevronRight, ChevronDown,
  Trash2, Loader2, Package, Users, Plus, Minus
} from 'lucide-react';
import {
  JavaScript, TypeScript, Python, CPlusPlus, C, Java, Go, RustDark, Ruby, PHP
} from 'developer-icons';

// ─── Tree Node Types ───────────────────────────────────────────────────

interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  fileId?: string;
  isDir: boolean;
  repoKey?: string;
}

// ─── Language Icons ────────────────────────────────────────────────────

const langIconMap: Record<string, { icon: any }> = {
  JavaScript: { icon: JavaScript }, TypeScript: { icon: TypeScript },
  Python: { icon: Python }, 'C++': { icon: CPlusPlus }, C: { icon: C },
  Java: { icon: Java }, Go: { icon: Go }, Rust: { icon: RustDark },
  Ruby: { icon: Ruby }, PHP: { icon: PHP },
};

function LangIcon({ language, size = 14 }: { language: string; size?: number }) {
  const entry = langIconMap[language];
  if (!entry) return <FileCode size={size} />;
  const Icon = entry.icon;
  return <span style={{ display: 'inline-flex', alignItems: 'center' }}><Icon size={size} /></span>;
}

// ─── Build Tree ────────────────────────────────────────────────────────

function buildTree(files: StoredFile[]): TreeNode {
  const root: TreeNode = { name: '', path: '', children: new Map(), isDir: true };

  for (const file of files) {
    const groupName = file.repoOrigin
      ? `${file.repoOrigin.owner}/${file.repoOrigin.repo}`
      : '';
    const filePath = file.path || file.name;
    const fullPath = groupName ? `${groupName}/${filePath}` : filePath;
    const parts = fullPath.split('/');

    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          children: new Map(),
          isDir: !isLast,
          repoKey: groupName || undefined,
        });
      }

      const node = current.children.get(part)!;
      if (isLast) {
        node.fileId = file.id;
        node.isDir = false;
      }
      current = node;
    }
  }

  return root;
}

// ─── Context Menu ──────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  fileId: string;
  isInCollab: boolean;
}

function ContextMenu({
  state, onClose, onAddToCollab, onRemoveFromCollab, isDark,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onAddToCollab: (fileId: string) => void;
  onRemoveFromCollab: (fileId: string) => void;
  isDark: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={`fixed z-[100] rounded-lg shadow-xl border py-1 min-w-[180px] animate-fade-in ${
        isDark
          ? 'bg-[#232340] border-slate-700/60 text-slate-200'
          : 'bg-white border-slate-200 text-slate-700'
      }`}
      style={{ left: state.x, top: state.y }}
    >
      {state.isInCollab ? (
        <button
          onClick={() => { onRemoveFromCollab(state.fileId); onClose(); }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
            isDark ? 'hover:bg-red-500/15 text-red-400' : 'hover:bg-red-50 text-red-500'
          }`}
        >
          <Minus size={13} /> Remove from Collab
        </button>
      ) : (
        <button
          onClick={() => { onAddToCollab(state.fileId); onClose(); }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
            isDark ? 'hover:bg-orange-500/15 text-orange-400' : 'hover:bg-orange-50 text-orange-600'
          }`}
        >
          <Plus size={13} /> Add to Collab
        </button>
      )}
    </div>
  );
}

// ─── Tree Node Renderer ───────────────────────────────────────────────

function TreeItem({
  node, depth, activeFileId, loadingFileId, onFileSelect, onFileDelete, onRepoDelete,
  onContextMenu, expandedPaths, toggleExpand, files, isDark, isCollabSection,
}: {
  node: TreeNode; depth: number; activeFileId: string | null; loadingFileId: string | null;
  onFileSelect: (id: string) => void; onFileDelete: (id: string) => void;
  onRepoDelete?: (repoKey: string) => void;
  onContextMenu?: (e: React.MouseEvent, fileId: string, isInCollab: boolean) => void;
  expandedPaths: Set<string>; toggleExpand: (path: string) => void;
  files: StoredFile[]; isDark: boolean; isCollabSection?: boolean;
}) {
  const isExpanded = expandedPaths.has(node.path);
  const isActive = node.fileId === activeFileId;
  const isLoading = node.fileId === loadingFileId;
  const isRepoRoot = depth === 0 && node.repoKey;
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  const storedFile = node.fileId ? files.find(f => f.id === node.fileId) : null;

  if (node.isDir) {
    const sortedChildren = Array.from(node.children.values()).sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return (
      <div>
        <button
          onClick={() => toggleExpand(node.path)}
          className={`w-full flex items-center gap-1.5 py-1 pr-2 rounded group transition-all duration-150 ease-out ${isDark ? 'hover:bg-slate-800/50 hover:translate-x-[1px]' : 'hover:bg-slate-100 hover:translate-x-[1px]'}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isExpanded
            ? <ChevronDown size={12} className={textMuted} />
            : <ChevronRight size={12} className={textMuted} />
          }
          {isRepoRoot
            ? <Package size={14} className="text-purple-400 shrink-0" />
            : isExpanded
              ? <FolderOpen size={14} className="text-blue-400 shrink-0" />
              : <FolderClosed size={14} className="text-blue-400 shrink-0" />
          }
          <span className={`text-[13px] truncate ${isRepoRoot ? 'font-semibold text-purple-400' : isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {node.name}
          </span>
          {isRepoRoot && onRepoDelete && (
            <button
              onClick={e => { e.stopPropagation(); onRepoDelete(node.repoKey!); }}
              className="ml-auto opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 transition-opacity"
            >
              <Trash2 size={11} />
            </button>
          )}
        </button>
        {isExpanded && sortedChildren.map(child => (
          <TreeItem
            key={child.path} node={child} depth={depth + 1}
            activeFileId={activeFileId} loadingFileId={loadingFileId}
            onFileSelect={onFileSelect} onFileDelete={onFileDelete}
            onRepoDelete={onRepoDelete} onContextMenu={onContextMenu}
            expandedPaths={expandedPaths} toggleExpand={toggleExpand}
            files={files} isDark={isDark} isCollabSection={isCollabSection}
          />
        ))}
      </div>
    );
  }

  // File node
  return (
    <button
      onClick={() => node.fileId && onFileSelect(node.fileId)}
      onContextMenu={(e) => {
        if (onContextMenu && node.fileId) {
          e.preventDefault();
          onContextMenu(e, node.fileId, !!isCollabSection);
        }
      }}
      className={`w-full flex items-center gap-1.5 py-1 pr-2 rounded group transition-all duration-150 ease-out ${
        isActive
          ? isDark
            ? 'bg-slate-800/80 text-blue-400'
            : 'bg-blue-50/80 text-blue-600'
          : isDark
            ? 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-300 hover:translate-x-[1px]'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 hover:translate-x-[1px]'
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      {isLoading
        ? <Loader2 size={13} className="animate-spin text-purple-400 shrink-0" />
        : <LangIcon language={storedFile?.language || ''} size={13} />
      }
      <span className="text-[13px] truncate">{node.name}</span>
      {!isCollabSection && !node.repoKey && (
        <button
          onClick={e => { e.stopPropagation(); node.fileId && onFileDelete(node.fileId); }}
          className="ml-auto opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 transition-opacity"
        >
          <Trash2 size={11} />
        </button>
      )}
    </button>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────

interface FileExplorerProps {
  files: StoredFile[];
  activeFileId: string | null;
  loadingFileId: string | null;
  onFileSelect: (id: string) => void;
  onFileDelete: (id: string) => void;
  onRepoDelete?: (repoKey: string) => void;
  // Collab
  isInRoom: boolean;
  isHost: boolean;
  sharedFiles: SharedFileInfo[];
  collabFileContents: Map<string, StoredFile>;
  onAddToCollab?: (fileId: string) => void;
  onRemoveFromCollab?: (fileId: string) => void;
  onSelectCollabFile?: (fileId: string) => void;
}

// ─── Main Component ────────────────────────────────────────────────────

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files, activeFileId, loadingFileId, onFileSelect, onFileDelete, onRepoDelete,
  isInRoom, isHost, sharedFiles, collabFileContents,
  onAddToCollab, onRemoveFromCollab, onSelectCollabFile,
}) => {
  const { isDark } = useTheme();
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Build tree from non-collab files only
  const localFiles = useMemo(() => {
    if (!isInRoom) return files;
    const sharedIds = new Set(sharedFiles.map(f => f.id));
    return files.filter(f => !sharedIds.has(f.id));
  }, [files, isInRoom, sharedFiles]);

  const tree = useMemo(() => buildTree(localFiles), [localFiles]);

  // Auto-expand repo roots
  useMemo(() => {
    const newExpanded = new Set(expandedPaths);
    tree.children.forEach((child) => {
      if (child.isDir && child.repoKey && !expandedPaths.has(child.path)) {
        newExpanded.add(child.path);
      }
    });
    if (newExpanded.size !== expandedPaths.size) {
      setExpandedPaths(newExpanded);
    }
  }, [tree]);

  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, fileId: string, isInCollab: boolean) => {
    if (!isInRoom || !isHost) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, fileId, isInCollab });
  };

  const sortedChildren = Array.from(tree.children.values()).sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  // Build collab file tree for the collab section
  const collabFiles = useMemo(() => {
    return sharedFiles.map(sf => {
      const local = collabFileContents.get(sf.id);
      return {
        ...sf,
        storedFile: local || { id: sf.id, name: sf.name, language: sf.language, content: '', contentHash: '', lastModified: Date.now() } as StoredFile,
      };
    });
  }, [sharedFiles, collabFileContents]);

  return (
    <div className="space-y-0.5 text-sm">
      {/* ── Collab Section ───────────────────────────────────────── */}
      {isInRoom && sharedFiles.length > 0 && (
        <div className="mb-3">
          {/* Collab header */}
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md mb-1 ${
            isDark ? 'bg-orange-500/10' : 'bg-orange-50'
          }`}>
            <Users size={13} className="text-orange-400" />
            <span className="text-[11px] font-bold tracking-wide uppercase text-orange-400">
              Collab
            </span>
            <span className={`text-[10px] ml-auto ${isDark ? 'text-orange-400/60' : 'text-orange-500/50'}`}>
              {sharedFiles.length} file{sharedFiles.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Collab files */}
          <div className="relative rounded-md overflow-hidden">
            <div className="pl-1">
              {collabFiles.map(cf => (
                <button
                  key={cf.id}
                  onClick={() => onSelectCollabFile?.(cf.id)}
                  onContextMenu={(e) => {
                    if (isHost) {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, fileId: cf.id, isInCollab: true });
                    }
                  }}
                  className={`w-full flex items-center gap-1.5 py-1.5 pr-2 pl-3 rounded group transition-all duration-150 ease-out ${
                    activeFileId === cf.id
                      ? isDark
                        ? 'bg-slate-800/80 text-blue-400'
                        : 'bg-blue-50/80 text-blue-600'
                      : isDark
                        ? 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-300 hover:translate-x-[1px]'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 hover:translate-x-[1px]'
                  }`}

                >
                  <LangIcon language={cf.language} size={13} />
                  <span className="text-[13px] truncate">{cf.name}</span>
                  {isHost && (
                    <button
                      onClick={e => { e.stopPropagation(); onRemoveFromCollab?.(cf.id); }}
                      className="ml-auto opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 transition-opacity"
                      title="Remove from collab"
                    >
                      <Minus size={11} />
                    </button>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Regular Files Section ────────────────────────────────── */}
      {isInRoom && sharedFiles.length > 0 && localFiles.length > 0 && (
        <>
          <div className={`border-t ${isDark ? 'border-slate-700/50' : 'border-slate-200'} my-2`} />
          <div className={`flex items-center gap-2 px-2 py-1 mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <span className="text-[11px] font-bold tracking-wide uppercase">
              My Files
            </span>
          </div>
        </>
      )}

      {sortedChildren.map(child => (
        <TreeItem
          key={child.path} node={child} depth={0}
          activeFileId={activeFileId} loadingFileId={loadingFileId}
          onFileSelect={onFileSelect} onFileDelete={onFileDelete}
          onRepoDelete={onRepoDelete}
          onContextMenu={isInRoom && isHost ? handleContextMenu : undefined}
          expandedPaths={expandedPaths} toggleExpand={toggleExpand}
          files={files} isDark={isDark}
        />
      ))}

      {/* ── Context Menu ─────────────────────────────────────────── */}
      {contextMenu && (
        <ContextMenu
          state={contextMenu}
          onClose={() => setContextMenu(null)}
          onAddToCollab={(fileId) => onAddToCollab?.(fileId)}
          onRemoveFromCollab={(fileId) => onRemoveFromCollab?.(fileId)}
          isDark={isDark}
        />
      )}
    </div>
  );
};
