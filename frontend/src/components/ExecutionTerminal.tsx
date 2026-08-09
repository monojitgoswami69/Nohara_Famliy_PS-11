import React, { useState, useRef } from 'react';
import { Play, Trash2, X, Terminal, CheckCircle2, AlertCircle, Clock, ChevronUp, ChevronDown, Cpu, KeyRound } from 'lucide-react';
import { StoredFile } from '../services/storageService';

interface OutputLog {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info' | 'system';
  content: string;
  timestamp: string;
}

interface ExecutionTerminalProps {
  file: StoredFile | null;
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const LANG_TO_API: Record<string, string> = {
  JavaScript: 'javascript', TypeScript: 'typescript',
  Python: 'python', Java: 'java',
  'C++': 'cpp', C: 'c', Go: 'go',
  Rust: 'rust', Ruby: 'ruby', PHP: 'php',
};

async function executeViaBackend(language: string, code: string, stdin: string): Promise<{
  stdout: string; stderr: string; exit_code: number; execution_time_ms: number; engine: string;
}> {
  const lang = LANG_TO_API[language] || language.toLowerCase();
  const res = await fetch(`${BACKEND_URL}/api/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: lang, code, stdin }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Backend error: ${res.statusText}`);
  return res.json();
}

function executeBrowserFallback(code: string): OutputLog[] {
  const logs: OutputLog[] = [];
  const addLog = (type: OutputLog['type'], args: any[]) => {
    const content = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
    logs.push({ id: Math.random().toString(), type, content, timestamp: new Date().toLocaleTimeString() });
  };
  const customConsole = {
    log: (...a: any[]) => addLog('log', a),
    warn: (...a: any[]) => addLog('warn', a),
    error: (...a: any[]) => addLog('error', a),
    info: (...a: any[]) => addLog('info', a),
  };
  try {
    const runner = new Function('console', code);
    runner(customConsole);
    addLog('system', ['✅ Execution completed (browser sandbox)']);
  } catch (err: any) {
    addLog('error', [`❌ ${err?.message || String(err)}`]);
  }
  return logs;
}

export const ExecutionTerminal: React.FC<ExecutionTerminalProps> = ({ file, isOpen, onClose, isDark }) => {
  const [logs, setLogs] = useState<OutputLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [engine, setEngine] = useState<string>('');
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [isMinimized, setIsMinimized] = useState(false);
  const [stdin, setStdin] = useState('');
  const [showStdin, setShowStdin] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const scrollToBottom = () => setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

  const handleRunCode = async () => {
    if (!file?.content?.trim()) {
      setLogs([{ id: Date.now().toString(), type: 'warn', content: '⚠️ File is empty.', timestamp: new Date().toLocaleTimeString() }]);
      return;
    }
    setIsRunning(true);
    setStatus('IDLE');
    setEngine('');
    const start = performance.now();

    try {
      // Try real backend first
      const result = await executeViaBackend(file.language || 'javascript', file.content, stdin);
      const duration = performance.now() - start;
      const newLogs: OutputLog[] = [];

      if (result.stdout) {
        result.stdout.trim().split('\n').forEach(line => {
          newLogs.push({ id: Math.random().toString(), type: 'log', content: line, timestamp: new Date().toLocaleTimeString() });
        });
      }
      if (result.stderr) {
        result.stderr.trim().split('\n').forEach(line => {
          newLogs.push({ id: Math.random().toString(), type: 'error', content: line, timestamp: new Date().toLocaleTimeString() });
        });
      }
      if (!result.stdout && !result.stderr) {
        newLogs.push({ id: Math.random().toString(), type: 'system', content: '(No output)', timestamp: new Date().toLocaleTimeString() });
      }
      setLogs(prev => [...prev, ...newLogs]);
      setStatus(result.exit_code === 0 ? 'SUCCESS' : 'ERROR');
      setExecutionTime(Math.round(result.execution_time_ms));
      setEngine(result.engine);

    } catch (_backendErr) {
      // Fallback: browser sandbox for JS
      const lang = (file.language || '').toLowerCase();
      if (lang === 'javascript' || lang === 'js') {
        const fallbackLogs = executeBrowserFallback(file.content);
        setLogs(prev => [...prev, ...fallbackLogs]);
        const hasErr = fallbackLogs.some(l => l.type === 'error');
        setStatus(hasErr ? 'ERROR' : 'SUCCESS');
        setEngine('browser-sandbox');
      } else {
        setLogs(prev => [...prev, {
          id: Date.now().toString(), type: 'error',
          content: '❌ Backend unavailable and no browser fallback for this language. Is the FastAPI server running?',
          timestamp: new Date().toLocaleTimeString(),
        }]);
        setStatus('ERROR');
      }
      setExecutionTime(Math.round(performance.now() - start));
    }

    setIsRunning(false);
    scrollToBottom();
  };

  const handleClear = () => { setLogs([]); setExecutionTime(null); setStatus('IDLE'); setEngine(''); };

  const logStyle = (type: OutputLog['type']) => {
    switch (type) {
      case 'error': return 'bg-neo-pink/20 text-red-600 dark:text-red-400 border-l-red-500';
      case 'warn': return 'bg-neo-yellow/30 text-amber-800 dark:text-amber-300 border-l-amber-500';
      case 'info': return 'bg-neo-blue/20 text-blue-800 dark:text-blue-300 border-l-blue-500';
      case 'system': return `border-l-slate-400 ${isDark ? 'text-slate-400' : 'text-slate-500'}`;
      default: return isDark ? 'text-slate-200' : 'text-slate-800';
    }
  };

  return (
    <div className={`border-t-2 border-black shadow-neo-lg transition-all ${isDark ? 'bg-[#181C2A] text-white' : 'bg-white text-black'}`}>

      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b-2 border-black bg-neo-yellow text-black font-black text-xs uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-black" />
          <span>{file?.name || 'Terminal'}</span>

          {status === 'SUCCESS' && (
            <span className="neo-badge bg-neo-green text-black px-1.5 py-0.5 text-[9px] flex items-center gap-1">
              <CheckCircle2 size={9} /> SUCCESS
            </span>
          )}
          {status === 'ERROR' && (
            <span className="neo-badge bg-neo-pink text-black px-1.5 py-0.5 text-[9px] flex items-center gap-1">
              <AlertCircle size={9} /> ERROR
            </span>
          )}
          {executionTime !== null && (
            <span className="text-[10px] font-mono text-black flex items-center gap-1">
              <Clock size={9} /> {executionTime}ms
            </span>
          )}
          {engine && (
            <span className="flex items-center gap-1 text-[9px] font-mono bg-black/20 px-1.5 py-0.5 border border-black/30">
              <Cpu size={8} /> {engine}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Stdin toggle */}
          <button
            onClick={() => setShowStdin(v => !v)}
            className={`flex items-center gap-1 px-2 py-0.5 border border-black font-black text-[9px] transition-all ${showStdin ? 'bg-neo-purple text-black' : 'bg-white hover:bg-neo-purple text-black'}`}
            title="Toggle Stdin Input"
          >
            <KeyRound size={10} /> STDIN
          </button>

          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-1 px-2.5 py-0.5 bg-neo-green hover:bg-neo-blue text-black border border-black font-black text-[10px] shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
          >
            <Play size={11} className="fill-black" /> {isRunning ? 'Running...' : 'RUN ⚡'}
          </button>

          <button onClick={handleClear} className="p-1 bg-white hover:bg-neo-purple text-black border border-black shadow-neo-sm" title="Clear">
            <Trash2 size={11} />
          </button>
          <button onClick={() => setIsMinimized(v => !v)} className="p-1 bg-white hover:bg-neo-yellow text-black border border-black">
            {isMinimized ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          <button onClick={onClose} className="p-1 bg-neo-pink hover:bg-red-400 text-black border border-black">
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Stdin textarea */}
      {showStdin && !isMinimized && (
        <div className={`px-3 py-2 border-b-2 border-black ${isDark ? 'bg-[#12141F]' : 'bg-slate-50'}`}>
          <label className={`block text-[10px] font-black uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Standard Input (stdin)
          </label>
          <textarea
            value={stdin}
            onChange={e => setStdin(e.target.value)}
            placeholder="Provide input for your program here..."
            rows={3}
            className={`w-full px-2 py-1.5 border-2 border-black font-mono text-xs resize-none outline-none focus:bg-neo-yellow/10 custom-scrollbar ${isDark ? 'bg-[#1E2235] text-white placeholder:text-slate-600' : 'bg-white text-black placeholder:text-slate-400'}`}
          />
        </div>
      )}

      {/* Terminal Body */}
      {!isMinimized && (
        <div className={`p-3 h-48 overflow-y-auto font-mono text-xs space-y-1 custom-scrollbar ${isDark ? 'bg-[#12141F]' : 'bg-[#FAF9F5]'}`}>
          {logs.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <Terminal size={22} className="mb-1 opacity-40" />
              <p className="text-xs uppercase font-bold">Console Ready</p>
              <p className="text-[10px] mt-0.5 opacity-80">Click "RUN ⚡" to execute your code via the backend or browser sandbox.</p>
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className={`p-1.5 border-l-2 border-black text-xs font-mono font-bold flex items-start gap-2 ${logStyle(log.type)}`}
              >
                <span className={`text-[9px] select-none shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>[{log.timestamp}]</span>
                <span className="whitespace-pre-wrap break-all flex-1">{log.content}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
};
