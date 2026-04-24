import React, { useState, useEffect, useCallback, useRef } from 'react';
import { loader } from '@monaco-editor/react';
import { EditorView } from './components/EditorView';
import { ThemeContext, useThemeProvider } from './hooks/useTheme';
import {
  getStoredFiles, saveFiles, getActiveFileId, setActiveFileId as saveActiveFileId,
  computeContentHash, StoredFile
} from './services/storageService';
import { detectLanguage, detectLanguageAI } from './utils/detectLanguage';
import { fetchRawContent, getStoredToken, GitHubRepo, RepoTreeItem } from './services/githubService';
import { GitHubImportModal } from './components/GitHubImportModal';
import { CollabRoomModal } from './components/CollabRoomModal';
import { useCollabRoom } from './hooks/useCollabRoom';

// Configure Monaco CDN path — @monaco-editor/react handles init internally
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.53.0/min/vs'
  }
});

export const App: React.FC = () => {
  const themeCtx = useThemeProvider();

  const [files, setFiles] = useState<StoredFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);

  // ─── Collab Room ─────────────────────────────────────────────────────
  const collab = useCollabRoom();
  const autoSharedRef = useRef(false);

  // Auto-share the active file when host creates a room
  useEffect(() => {
    if (
      collab.isHost &&
      collab.status === 'connected' &&
      collab.sharedFiles.length === 0 &&
      !autoSharedRef.current
    ) {
      const file = activeFileId ? files.find(f => f.id === activeFileId) : null;
      if (file) {
        autoSharedRef.current = true;
        collab.shareFile({
          id: file.id,
          name: file.name,
          language: file.language,
          content: file.content,
        });
      }
    }
    if (collab.status === 'disconnected') {
      autoSharedRef.current = false;
    }
  }, [collab.isHost, collab.status, collab.sharedFiles.length, activeFileId, files]);

  useEffect(() => {
    const stored = getStoredFiles();
    const storedActive = getActiveFileId();
    setFiles(stored);
    if (stored.length > 0) {
      const active = storedActive && stored.some(f => f.id === storedActive)
        ? storedActive
        : stored[0].id;
      setActiveFileId(active);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) saveFiles(files);
  }, [files, isInitialized]);

  useEffect(() => {
    if (isInitialized && activeFileId) saveActiveFileId(activeFileId);
  }, [activeFileId, isInitialized]);

  const handleFileCreate = useCallback(() => {
    const newFile: StoredFile = {
      id: Date.now().toString(),
      name: `Snippet-${files.length + 1}`,
      content: '',
      language: '',
      contentHash: computeContentHash(''),
      lastModified: Date.now(),
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
  }, [files.length]);

  const handleFileUpload = useCallback(async (file: File) => {
    const text = await file.text();
    const fileId = Date.now().toString();
    const syncLanguage = detectLanguage(file.name, text);
    const newFile: StoredFile = {
      id: fileId,
      name: file.name,
      content: text,
      language: syncLanguage,
      contentHash: computeContentHash(text),
      lastModified: Date.now(),
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(fileId);
    // Refine with Magika AI in background
    detectLanguageAI(file.name, text).then(aiLang => {
      if (aiLang && aiLang !== syncLanguage) {
        setFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, language: aiLang } : f
        ));
      }
    });
  }, []);

  const handleFileDelete = useCallback((id: string) => {
    setFiles(prev => {
      const next = prev.filter(f => f.id !== id);
      if (activeFileId === id) {
        setActiveFileId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  }, [activeFileId]);

  const handleCodeChange = useCallback((id: string, newCode: string) => {
    setFiles(prev => prev.map(f =>
      f.id === id
        ? { ...f, content: newCode, contentHash: computeContentHash(newCode), lastModified: Date.now() }
        : f
    ));
  }, []);

  const handleLanguageChange = useCallback((id: string, language: string) => {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, language, lastModified: Date.now() } : f
    ));
  }, []);

  const handleGitHubImport = useCallback((fileName: string, content: string, language: string) => {
    const fileId = Date.now().toString();
    const newFile: StoredFile = {
      id: fileId,
      name: fileName,
      content,
      language,
      contentHash: computeContentHash(content),
      lastModified: Date.now(),
      contentLoaded: true,
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(fileId);
    // Refine with Magika AI in background
    detectLanguageAI(fileName, content).then(aiLang => {
      if (aiLang && aiLang !== language) {
        setFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, language: aiLang } : f
        ));
      }
    });
  }, []);

  // ─── Full Repo Import ────────────────────────────────────────────────
  const handleRepoImport = useCallback((repo: GitHubRepo, tree: RepoTreeItem[]) => {
    // Filter to only blob (file) entries, skip dirs
    const fileEntries = tree.filter(item => item.type === 'blob');
    const newFiles: StoredFile[] = fileEntries.map((item, i) => {
      const fileName = item.path.split('/').pop() || item.path;
      return {
        id: `${Date.now()}-${i}`,
        name: fileName,
        content: '',  // lazy loaded
        language: detectLanguage(fileName, ''),
        contentHash: computeContentHash(''),
        lastModified: Date.now(),
        path: item.path,
        repoOrigin: {
          owner: repo.owner.login,
          repo: repo.name,
          branch: repo.default_branch,
        },
        contentLoaded: false,
      };
    });
    setFiles(prev => [...prev, ...newFiles]);
    if (newFiles.length > 0) setActiveFileId(newFiles[0].id);
  }, []);

  // ─── Lazy File Select (loads content on demand) ──────────────────────
  const handleFileSelect = useCallback(async (id: string) => {
    setActiveFileId(id);
    // Check if this file needs lazy loading
    const file = files.find(f => f.id === id);
    if (file && file.repoOrigin && !file.contentLoaded) {
      setLoadingFileId(id);
      try {
        const token = getStoredToken();
        const content = await fetchRawContent(
          file.repoOrigin.owner, file.repoOrigin.repo,
          file.repoOrigin.branch, file.path || file.name, token
        );
        const syncLang = detectLanguage(file.name, content);
        setFiles(prev => prev.map(f =>
          f.id === id
            ? { ...f, content, language: syncLang, contentHash: computeContentHash(content), contentLoaded: true }
            : f
        ));
        // Refine with Magika AI in background
        detectLanguageAI(file.name, content).then(aiLang => {
          if (aiLang && aiLang !== syncLang) {
            setFiles(prev => prev.map(f =>
              f.id === id ? { ...f, language: aiLang } : f
            ));
          }
        });
      } catch (err) {
        console.error('Failed to load file content:', err);
        setFiles(prev => prev.map(f =>
          f.id === id
            ? { ...f, content: `// Error loading file: ${(err as Error).message}`, contentLoaded: true }
            : f
        ));
      } finally {
        setLoadingFileId(null);
      }
    }
  }, [files]);

  // ─── Delete entire repo from sidebar ─────────────────────────────────
  const handleRepoDelete = useCallback((repoKey: string) => {
    setFiles(prev => {
      const next = prev.filter(f => {
        if (!f.repoOrigin) return true;
        return `${f.repoOrigin.owner}/${f.repoOrigin.repo}` !== repoKey;
      });
      if (activeFileId && !next.some(f => f.id === activeFileId)) {
        setActiveFileId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  }, [activeFileId]);

  return (
    <ThemeContext.Provider value={themeCtx}>
      <div className="min-h-screen font-sans flex flex-col relative overflow-hidden">
        <EditorView
          files={files}
          activeFileId={activeFileId}
          loadingFileId={loadingFileId}
          onFileSelect={handleFileSelect}
          onFileCreate={handleFileCreate}
          onFileDelete={handleFileDelete}
          onFileUpload={handleFileUpload}
          onCodeChange={handleCodeChange}
          onLanguageChange={handleLanguageChange}
          onOpenGitHub={() => setShowGitHubModal(true)}
          onOpenCollab={() => setShowCollabModal(true)}
          onRepoDelete={handleRepoDelete}
          collab={collab}
        />
        <GitHubImportModal
          isOpen={showGitHubModal}
          onClose={() => setShowGitHubModal(false)}
          onImport={handleGitHubImport}
          onImportRepo={handleRepoImport}
        />
        <CollabRoomModal
          isOpen={showCollabModal}
          onClose={() => setShowCollabModal(false)}
          onCreateRoom={(name, id) => { collab.createRoom(name, id); setShowCollabModal(false); }}
          onJoinRoom={(name, id) => { collab.joinRoom(name, id); setShowCollabModal(false); }}
        />
      </div>
    </ThemeContext.Provider>
  );
};
