import React, { useState, useMemo } from 'react';
import { StoredFile } from '../services/storageService';
import { useTheme } from '../hooks/useTheme';
import {
  FileCode, FolderOpen, FolderClosed, ChevronRight, ChevronDown,
  Trash2, Loader2, Package
} from 'lucide-react';
import {
  JavaScript, TypeScript, Python, CPlusPlus, C, Java, Go, RustDark, Ruby, PHP
} from 'developer-icons';

// ─── Tree Node Types ───────────────────────────────────────────────────

interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  fileId?: string;       // present for file nodes
  isDir: boolean;
  repoKey?: string;      // e.g. "owner/repo"
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

  // Group: repo files go under "owner/repo", standalone snippets go under "Snippets"
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

// ─── Props ─────────────────────────────────────────────────────────────

interface FileExplorerProps {
  files: StoredFile[];
  activeFileId: string | null;
  loadingFileId: string | null;
  onFileSelect: (id: string) => void;
  onFileDelete: (id: string) => void;
  onRepoDelete?: (repoKey: string) => void;
}

// ─── Tree Node Renderer ───────────────────────────────────────────────

function TreeItem({
  node, depth, activeFileId, loadingFileId, onFileSelect, onFileDelete, onRepoDelete,
  expandedPaths, toggleExpand, files, isDark
}: {
  node: TreeNode; depth: number; activeFileId: string | null; loadingFileId: string | null;
  onFileSelect: (id: string) => void; onFileDelete: (id: string) => void;
  onRepoDelete?: (repoKey: string) => void;
  expandedPaths: Set<string>; toggleExpand: (path: string) => void;
  files: StoredFile[]; isDark: boolean;
}) {
  const isExpanded = expandedPaths.has(node.path);
  const isActive = node.fileId === activeFileId;
  const isLoading = node.fileId === loadingFileId;
  const isRepoRoot = depth === 0 && node.repoKey;
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  // Find the stored file for language info
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
          className={`w-full flex items-center gap-1.5 py-1 pr-2 rounded transition-colors group ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-100'}`}
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
            onRepoDelete={onRepoDelete}
            expandedPaths={expandedPaths} toggleExpand={toggleExpand}
            files={files} isDark={isDark}
          />
        ))}
      </div>
    );
  }

  // File node
  return (
    <button
      onClick={() => node.fileId && onFileSelect(node.fileId)}
      className={`w-full flex items-center gap-1.5 py-1 pr-2 rounded transition-colors group ${
        isActive
          ? isDark ? 'bg-slate-800 text-blue-400 border border-slate-700/50' : 'bg-blue-50 text-blue-600 border border-blue-200'
          : isDark ? 'text-slate-400 hover:bg-slate-800/40' : 'text-slate-600 hover:bg-slate-50'
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      {isLoading
        ? <Loader2 size={13} className="animate-spin text-purple-400 shrink-0" />
        : <LangIcon language={storedFile?.language || ''} size={13} />
      }
      <span className="text-[13px] truncate">{node.name}</span>
      {!node.repoKey && (
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

// ─── Main Component ────────────────────────────────────────────────────

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files, activeFileId, loadingFileId, onFileSelect, onFileDelete, onRepoDelete,
}) => {
  const { isDark } = useTheme();
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(files), [files]);

  // Auto-expand repo roots on first render
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

  const sortedChildren = Array.from(tree.children.values()).sort((a, b) => {
    // Repos first, then standalone files
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-0.5 text-sm">
      {sortedChildren.map(child => (
        <TreeItem
          key={child.path} node={child} depth={0}
          activeFileId={activeFileId} loadingFileId={loadingFileId}
          onFileSelect={onFileSelect} onFileDelete={onFileDelete}
          onRepoDelete={onRepoDelete}
          expandedPaths={expandedPaths} toggleExpand={toggleExpand}
          files={files} isDark={isDark}
        />
      ))}
    </div>
  );
};
