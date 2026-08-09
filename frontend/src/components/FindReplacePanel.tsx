/**
 * FindReplacePanel — Inline find & replace bar that appears below editor tabs.
 * Uses Monaco's built-in find controller actions via the editor ref.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, ChevronUp, ChevronDown, Replace, ReplaceAll,
  CaseSensitive, WholeWord, Regex, Search
} from 'lucide-react';
import type * as MonacoType from 'monaco-editor';

interface FindReplacePanelProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  editorRef: React.MutableRefObject<MonacoType.editor.IStandaloneCodeEditor | null>;
}

export const FindReplacePanel: React.FC<FindReplacePanelProps> = ({
  isOpen,
  onClose,
  isDark,
  editorRef,
}) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matchInfo, setMatchInfo] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const findInputRef = useRef<HTMLInputElement>(null);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => findInputRef.current?.focus(), 50);
    } else {
      setFindText('');
      setReplaceText('');
      setMatchInfo('');
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'h' && isOpen) {
        e.preventDefault();
        setShowReplace(v => !v);
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [isOpen, onClose]);

  const doFind = useCallback((text: string) => {
    const editor = editorRef.current;
    if (!editor || !text) { setMatchInfo(''); return; }
    const model = editor.getModel();
    if (!model) return;
    const matches = model.findMatches(text, false, useRegex, matchCase, wholeWord ? text : null, false);
    setMatchInfo(matches.length > 0 ? `${matches.length} match${matches.length !== 1 ? 'es' : ''}` : 'No results');
    // Trigger Monaco's native find widget so navigation works
    editor.trigger('findPanel', 'actions.find', {});
  }, [editorRef, matchCase, wholeWord, useRegex]);

  const handleFindChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFindText(e.target.value);
    doFind(e.target.value);
  };

  const findNext = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.trigger('keyboard', 'editor.action.nextMatchFindAction', {});
  };

  const findPrev = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.trigger('keyboard', 'editor.action.previousMatchFindAction', {});
  };

  const handleReplace = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = editor.getSelection();
    const model = editor.getModel();
    if (!sel || !model) return;
    const selectedText = model.getValueInRange(sel);
    if (selectedText.toLowerCase() === findText.toLowerCase() || selectedText === findText) {
      editor.executeEdits('find-replace', [{
        range: sel,
        text: replaceText,
        forceMoveMarkers: true,
      }]);
    }
    findNext();
  };

  const handleReplaceAll = () => {
    const editor = editorRef.current;
    if (!editor || !findText) return;
    const model = editor.getModel();
    if (!model) return;
    const matches = model.findMatches(findText, false, useRegex, matchCase, wholeWord ? findText : null, false);
    if (matches.length === 0) return;
    const edits = matches.map(m => ({ range: m.range, text: replaceText, forceMoveMarkers: true }));
    editor.executeEdits('replace-all', edits);
    setMatchInfo(`Replaced ${matches.length} occurrence${matches.length !== 1 ? 's' : ''}`);
  };

  if (!isOpen) return null;

  const bg = isDark ? 'bg-[#1A1D2E]' : 'bg-[#EDEBE4]';
  const inputBg = isDark ? 'bg-[#232332] text-white border-slate-600' : 'bg-white text-black border-slate-300';
  const btnBase = `p-1.5 border border-black font-bold text-xs transition-all hover:bg-neo-yellow hover:text-black active:translate-x-px active:translate-y-px`;
  const toggleActive = (on: boolean) => on ? 'bg-neo-yellow text-black border-black' : isDark ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-white text-slate-600 border-slate-300';

  return (
    <div className={`flex flex-col gap-1.5 px-3 py-2 border-b-2 border-black ${bg} shrink-0 shadow-neo-sm`}>
      <div className="flex items-center gap-2">
        {/* Expand/Collapse replace */}
        <button
          onClick={() => setShowReplace(v => !v)}
          className={`p-1 border border-black transition-all ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-200'}`}
          title="Toggle Replace (Ctrl+H)"
        >
          <ChevronDown size={12} className={`transition-transform ${showReplace ? '' : '-rotate-90'}`} />
        </button>

        {/* Find input */}
        <div className="flex items-center flex-1 border-2 border-black shadow-neo-sm">
          <Search size={12} className={`ml-2 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            ref={findInputRef}
            type="text"
            value={findText}
            onChange={handleFindChange}
            onKeyDown={e => { if (e.key === 'Enter') e.shiftKey ? findPrev() : findNext(); }}
            placeholder="Find..."
            className={`flex-1 px-2 py-1 text-xs font-mono font-bold outline-none bg-transparent ${isDark ? 'text-white placeholder:text-slate-500' : 'text-black placeholder:text-slate-400'}`}
          />
          {matchInfo && (
            <span className={`text-[10px] font-bold px-2 shrink-0 ${matchInfo.includes('No') ? 'text-red-400' : isDark ? 'text-neo-green' : 'text-green-700'}`}>
              {matchInfo}
            </span>
          )}
        </div>

        {/* Options: Case, Word, Regex */}
        <div className="flex gap-1">
          <button
            onClick={() => setMatchCase(v => !v)}
            className={`${btnBase} ${toggleActive(matchCase)}`}
            title="Match Case"
          >
            <CaseSensitive size={13} />
          </button>
          <button
            onClick={() => setWholeWord(v => !v)}
            className={`${btnBase} ${toggleActive(wholeWord)}`}
            title="Whole Word"
          >
            <WholeWord size={13} />
          </button>
          <button
            onClick={() => setUseRegex(v => !v)}
            className={`${btnBase} ${toggleActive(useRegex)}`}
            title="Use Regex"
          >
            <Regex size={13} />
          </button>
        </div>

        {/* Prev / Next */}
        <div className="flex gap-1">
          <button onClick={findPrev} className={`${btnBase} ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-black'}`} title="Previous Match (Shift+Enter)">
            <ChevronUp size={13} />
          </button>
          <button onClick={findNext} className={`${btnBase} ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-black'}`} title="Next Match (Enter)">
            <ChevronDown size={13} />
          </button>
        </div>

        {/* Close */}
        <button onClick={onClose} className="p-1.5 border border-black bg-neo-pink text-black hover:bg-red-400 font-bold transition-all" title="Close (Esc)">
          <X size={13} />
        </button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="flex items-center gap-2 pl-6">
          <div className="flex items-center flex-1 border-2 border-black shadow-neo-sm">
            <Replace size={12} className={`ml-2 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              value={replaceText}
              onChange={e => setReplaceText(e.target.value)}
              placeholder="Replace..."
              className={`flex-1 px-2 py-1 text-xs font-mono font-bold outline-none bg-transparent ${isDark ? 'text-white placeholder:text-slate-500' : 'text-black placeholder:text-slate-400'}`}
            />
          </div>
          <button
            onClick={handleReplace}
            className="flex items-center gap-1 px-3 py-1.5 border-2 border-black bg-neo-blue text-black font-black text-[10px] uppercase shadow-neo-sm hover:bg-neo-purple transition-all active:translate-x-px active:translate-y-px"
          >
            <Replace size={11} /> Replace
          </button>
          <button
            onClick={handleReplaceAll}
            className="flex items-center gap-1 px-3 py-1.5 border-2 border-black bg-neo-purple text-black font-black text-[10px] uppercase shadow-neo-sm hover:bg-neo-yellow transition-all active:translate-x-px active:translate-y-px"
          >
            <ReplaceAll size={11} /> All
          </button>
        </div>
      )}
    </div>
  );
};
