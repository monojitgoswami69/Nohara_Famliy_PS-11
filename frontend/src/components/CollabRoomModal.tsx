/**
 * CollabRoomModal — UI for creating or joining a collaborative room.
 *
 * Two tabs:
 *   • Create Room: enter display name → generates a room ID → host mode
 *   • Join Room: enter room ID + display name → sends join request
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useMountTransition } from '../hooks/useMountTransition';
import { X, Users, Plus, LogIn, Copy, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (displayName: string, roomId: string) => void;
  onJoinRoom: (displayName: string, roomId: string) => void;
  joinError?: string | null;
  onClearJoinError?: () => void;
}

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export const CollabRoomModal: React.FC<Props> = ({ isOpen, onClose, onCreateRoom, onJoinRoom, joinError, onClearJoinError }) => {
  const { isDark } = useTheme();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('codecollab_displayName') || '');
  const [roomId, setRoomId] = useState('');
  const [generatedId] = useState(generateRoomId);

  useEffect(() => {
    localStorage.setItem('codecollab_displayName', displayName);
  }, [displayName]);
  const [copied, setCopied] = useState(false);

  const { hasRendered, isActive } = useMountTransition(isOpen, 300);

  if (!hasRendered) return null;

  const bg = isDark ? 'bg-[#181C2A]' : 'bg-white';
  const inputBg = isDark ? 'bg-slate-800' : 'bg-slate-50';
  const inputBorder = 'border-2.5 border-black shadow-neo-sm';
  const inputText = isDark ? 'text-white font-bold' : 'text-black font-bold';


  const handleCopyId = () => {
    navigator.clipboard.writeText(generatedId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = () => {
    if (!displayName.trim()) return;
    onCreateRoom(displayName.trim(), generatedId);
    onClose();
  };

  const handleJoin = () => {
    if (!displayName.trim() || !roomId.trim()) return;
    onClearJoinError?.();
    onJoinRoom(displayName.trim(), roomId.trim().toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ease-out ${isActive ? 'opacity-100' : 'opacity-0'}`} />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md mx-4 ${bg} border-3 border-black shadow-neo-xl overflow-hidden transition-all duration-300 ease-out transform ${isActive ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2.5 border-black bg-neo-yellow text-black font-black">
          <div className="flex items-center gap-2">
            <Users size={22} className="text-black" />
            <h2 className="text-lg font-black uppercase tracking-wide">Live Collaboration</h2>
          </div>
          <button onClick={onClose} className="p-1 border-2 border-black bg-neo-pink text-black hover:bg-red-400 font-bold">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2.5 border-black bg-slate-100 dark:bg-slate-900">
          {(['create', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-black uppercase tracking-wide transition-all ${
                tab === t
                  ? 'bg-neo-purple text-black border-r-2 border-l-2 border-black shadow-neo-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {t === 'create' ? (
                <span className="flex items-center justify-center gap-1.5"><Plus size={15} /> Host Room</span>
              ) : (
                <span className="flex items-center justify-center gap-1.5"><LogIn size={15} /> Join Room</span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5 text-slate-800 dark:text-slate-200">DISPLAY NAME</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Alex"
              maxLength={30}
              className={`w-full px-3 py-2.5 ${inputBg} ${inputBorder} ${inputText} text-sm outline-none placeholder:text-slate-400 focus:bg-neo-yellow/20`}
            />
          </div>

          <div className="grid grid-cols-1">
            {/* Create Room Tab */}
            <div
              className={`col-start-1 row-start-1 flex flex-col space-y-4 transition-all duration-300 ${
                tab === 'create' ? 'opacity-100 z-10' : 'opacity-0 -z-10 invisible'
              }`}
            >
              {/* Generated Room ID */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1.5 text-slate-800 dark:text-slate-200">ROOM CODE</label>
                <div className="flex gap-2">
                  <div className={`flex-1 flex items-center px-4 py-2.5 ${inputBg} ${inputBorder} font-mono text-xl tracking-[0.3em] font-black text-black dark:text-white select-all bg-neo-yellow/30`}>
                    {generatedId}
                  </div>
                  <button
                    onClick={handleCopyId}
                    className="flex items-center justify-center px-4 border-2.5 border-black bg-neo-blue hover:bg-neo-purple text-black font-bold shadow-neo-sm transition-all active:translate-x-0.5 active:translate-y-0.5"
                    title="Copy Room ID"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={!displayName.trim()}
                className="w-full py-3 neo-btn bg-neo-green hover:bg-neo-yellow text-black font-black text-sm uppercase tracking-wide disabled:opacity-40 disabled:pointer-events-none mt-2"
              >
                Create & Host Room
              </button>
            </div>

            {/* Join Room Tab */}
            <div
              className={`col-start-1 row-start-1 flex flex-col space-y-4 transition-all duration-300 ${
                tab === 'join' ? 'opacity-100 z-10' : 'opacity-0 -z-10 invisible'
              }`}
            >
              {/* Room ID input */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1.5 text-slate-800 dark:text-slate-200">ENTER ROOM CODE</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={e => { setRoomId(e.target.value.toUpperCase()); onClearJoinError?.(); }}
                  placeholder="e.g. A3K7M2"
                  maxLength={10}
                  className={`w-full px-4 py-2.5 ${inputBg} ${inputBorder} font-mono text-xl tracking-[0.3em] font-black ${inputText} outline-none uppercase focus:bg-neo-yellow/20`}
                />
                {joinError && (
                  <p className="text-xs mt-1.5 text-red-500 font-black">{joinError}</p>
                )}
              </div>

              <button
                onClick={handleJoin}
                disabled={!displayName.trim() || !roomId.trim()}
                className="w-full py-3 neo-btn bg-neo-green hover:bg-neo-yellow text-black font-black text-sm uppercase tracking-wide disabled:opacity-40 disabled:pointer-events-none mt-2"
              >
                Request to Join
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

