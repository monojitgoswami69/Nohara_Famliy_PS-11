import React from 'react';
import { X, Plus, FileCode } from 'lucide-react';
import { StoredFile } from '../services/storageService';

interface EditorTabsProps {
  files: StoredFile[];
  openFileIds: string[];
  activeFileId: string | null;
  onSelectTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onNewTab: () => void;
  isDark: boolean;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({
  files,
  openFileIds,
  activeFileId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  isDark,
}) => {
  const openFiles = openFileIds
    .map(id => files.find(f => f.id === id))
    .filter((f): f is StoredFile => f !== undefined);

  if (openFiles.length === 0) return null;

  return (
    <div className={`flex items-center gap-1 px-2 pt-1.5 overflow-x-auto custom-scrollbar border-b-2.5 border-black ${isDark ? 'bg-[#141724]' : 'bg-[#E5E0D8]'}`}>
      {openFiles.map(file => {
        const isActive = file.id === activeFileId;

        return (
          <div
            key={file.id}
            onClick={() => onSelectTab(file.id)}
            className={`group flex items-center gap-2 px-3 py-1.5 border-t-2 border-x-2 border-black font-black text-xs cursor-pointer select-none transition-all ${
              isActive
                ? 'bg-neo-yellow text-black shadow-neo-sm font-black -mb-[2.5px] z-10'
                : isDark
                  ? 'bg-[#1E2235] text-slate-300 hover:bg-[#2A2E45] hover:text-white'
                  : 'bg-white text-slate-800 hover:bg-slate-100 hover:text-black'
            }`}
          >
            <FileCode size={13} className={isActive ? 'text-black' : isDark ? 'text-neo-purple' : 'text-blue-600'} />
            <span className="truncate max-w-[120px]">{file.name}</span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(file.id);
              }}
              className={`p-0.5 rounded-none border border-transparent group-hover:border-black hover:bg-neo-pink hover:text-black transition-all ${
                isActive ? 'text-black' : 'text-slate-400 group-hover:text-black'
              }`}
              title="Close Tab"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}

      <button
        onClick={onNewTab}
        className={`p-1.5 border-2 border-black font-bold text-xs transition-all active:translate-x-0.5 active:translate-y-0.5 ml-1 ${
          isDark ? 'bg-neo-green text-black hover:bg-neo-yellow' : 'bg-neo-green text-black hover:bg-neo-yellow'
        }`}
        title="New Snippet Tab"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};
