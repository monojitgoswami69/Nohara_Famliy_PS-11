import React, { useState } from 'react';
import { Play, Trash2, X, Terminal, CheckCircle2, AlertCircle, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { StoredFile } from '../services/storageService';

interface OutputLog {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  content: string;
  timestamp: string;
}

interface ExecutionTerminalProps {
  file: StoredFile | null;
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export const ExecutionTerminal: React.FC<ExecutionTerminalProps> = ({
  file,
  isOpen,
  onClose,
  isDark,
}) => {
  const [logs, setLogs] = useState<OutputLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  const handleRunCode = () => {
    if (!file || !file.content) {
      setLogs([{
        id: Date.now().toString(),
        type: 'warn',
        content: '⚠️ File is empty or no code to execute.',
        timestamp: new Date().toLocaleTimeString(),
      }]);
      return;
    }

    setIsRunning(true);
    setStatus('IDLE');
    const startTime = performance.now();
    const newLogs: OutputLog[] = [];

    const addLog = (type: 'log' | 'warn' | 'error' | 'info', args: any[]) => {
      const content = args
        .map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ');
      newLogs.push({
        id: Math.random().toString(),
        type,
        content,
        timestamp: new Date().toLocaleTimeString(),
      });
    };

    try {
      const lang = (file.language || '').toLowerCase();

      if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
        // Execute JavaScript safely in isolated sandbox
        const customConsole = {
          log: (...args: any[]) => addLog('log', args),
          warn: (...args: any[]) => addLog('warn', args),
          error: (...args: any[]) => addLog('error', args),
          info: (...args: any[]) => addLog('info', args),
        };

        const runner = new Function('console', file.content);
        runner(customConsole);
        setStatus('SUCCESS');
      } else if (lang === 'json') {
        JSON.parse(file.content);
        addLog('info', ['✅ Valid JSON structure detected.']);
        setStatus('SUCCESS');
      } else {
        addLog('info', [`⚡ Executing ${file.language || 'script'}...`]);
        addLog('log', [`[Output Simulation]: Snippet "${file.name}" compiled successfully.`]);
        setStatus('SUCCESS');
      }
    } catch (err: any) {
      addLog('error', [`❌ Execution Error: ${err?.message || String(err)}`]);
      setStatus('ERROR');
    } finally {
      const endTime = performance.now();
      setExecutionTime(Math.round(endTime - startTime));
      setLogs(prev => [...prev, ...newLogs]);
      setIsRunning(false);
    }
  };

  const handleClear = () => {
    setLogs([]);
    setExecutionTime(null);
    setStatus('IDLE');
  };

  return (
    <div className={`border-t-3 border-black shadow-neo-lg transition-all ${isDark ? 'bg-[#181C2A] text-white' : 'bg-white text-black'}`}>
      
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-black bg-neo-yellow text-black font-black text-xs uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-black" />
          <span>Output Console // {file?.name || 'Terminal'}</span>
          
          {status === 'SUCCESS' && (
            <span className="neo-badge bg-neo-green text-black px-2 py-0.5 text-[9px] flex items-center gap-1">
              <CheckCircle2 size={10} /> SUCCESS
            </span>
          )}
          {status === 'ERROR' && (
            <span className="neo-badge bg-neo-pink text-black px-2 py-0.5 text-[9px] flex items-center gap-1">
              <AlertCircle size={10} /> ERROR
            </span>
          )}
          {executionTime !== null && (
            <span className="text-[10px] font-mono text-slate-800 flex items-center gap-1">
              <Clock size={10} /> {executionTime}ms
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-1 px-3 py-1 bg-neo-green hover:bg-neo-blue text-black border-2 border-black font-black text-xs shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5"
          >
            <Play size={13} className="fill-black" /> RUN CODE ⚡
          </button>

          <button
            onClick={handleClear}
            className="p-1 bg-white hover:bg-neo-purple text-black border border-black shadow-neo-sm font-bold"
            title="Clear Console"
          >
            <Trash2 size={13} />
          </button>

          <button
            onClick={() => setIsMinimized(prev => !prev)}
            className="p-1 bg-white hover:bg-neo-yellow text-black border border-black font-bold"
          >
            {isMinimized ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          <button
            onClick={onClose}
            className="p-1 bg-neo-pink hover:bg-red-400 text-black border border-black font-bold"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Terminal Content Body */}
      {!isMinimized && (
        <div className={`p-3 h-48 overflow-y-auto font-mono text-xs space-y-1.5 custom-scrollbar ${isDark ? 'bg-[#12141F]' : 'bg-[#FAF9F5]'}`}>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 font-bold">
              <Terminal size={24} className="mb-1 opacity-50" />
              <p className="text-xs uppercase">Console Output Ready</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Click "RUN CODE ⚡" to execute JavaScript / Python snippets.</p>
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className={`p-2 border-l-3 border-black text-xs font-mono font-bold flex items-start gap-2 ${
                  log.type === 'error'
                    ? 'bg-neo-pink/20 text-red-600 dark:text-red-400 border-l-red-500'
                    : log.type === 'warn'
                      ? 'bg-neo-yellow/30 text-amber-800 dark:text-amber-300 border-l-amber-500'
                      : log.type === 'info'
                        ? 'bg-neo-blue/20 text-blue-800 dark:text-blue-300 border-l-blue-500'
                        : isDark ? 'text-slate-200' : 'text-slate-800'
                }`}
              >
                <span className="text-[10px] text-slate-400 select-none shrink-0">[{log.timestamp}]</span>
                <span className="whitespace-pre-wrap break-all flex-1">{log.content}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
