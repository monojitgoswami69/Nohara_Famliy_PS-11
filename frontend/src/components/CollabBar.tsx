/**
 * CollabBar — Status bar displayed when a collab room is active.
 *
 * Shows: room ID, connection status, member avatars, pending join requests (host only),
 * and a leave button.
 */

import React, { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useMountTransition } from '../hooks/useMountTransition';
import {
  Users, Wifi, WifiOff, Loader2, Copy, Check, LogOut,
  UserCheck, UserX, Clock, Crown, X,
} from 'lucide-react';
import { CollabMember, PendingRequest, CollabStatus } from '../services/collabService';
import { CollabToast } from '../hooks/useCollabRoom';

interface Props {
  roomId: string;
  status: CollabStatus;
  isHost: boolean;
  members: CollabMember[];
  pending: PendingRequest[];
  toasts: CollabToast[];
  onApprove: (peerId: string) => void;
  onReject: (peerId: string) => void;
  onLeave: () => void;
  onDismissToast: (id: string) => void;
}

export const CollabBar: React.FC<Props> = ({
  roomId, status, isHost, members, pending,
  onApprove, onReject, onLeave,
}) => {
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const { hasRendered, isActive } = useMountTransition(showPanel, 300);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusIcon = () => {
    switch (status) {
      case 'connected': return <Wifi size={15} className="text-green-400" />;
      case 'connecting':
      case 'waiting-approval': return <Loader2 size={15} className="animate-spin text-yellow-400" />;
      default: return <WifiOff size={15} className="text-red-400" />;
    }
  };

  const statusLabel = () => {
    switch (status) {
      case 'connected': return 'CONNECTED';
      case 'connecting': return 'CONNECTING...';
      case 'waiting-approval': return 'WAITING FOR APPROVAL...';
      case 'rejected': return 'REJECTED';
      case 'error': return 'ERROR';
      default: return 'DISCONNECTED';
    }
  };

  const bg = isDark ? 'bg-[#181C2A]' : 'bg-[#FFF9EA]';
  const panelBg = isDark ? 'bg-[#1B1C28]' : 'bg-white';
  const textP = isDark ? 'text-white' : 'text-slate-900';


  return (
    <>
      {/* ── Collab status bar ─────────────────────────────────────────── */}
      <div className={`h-12 flex items-center justify-between px-4 text-[13px] kode-font font-black ${bg} ${isDark ? 'text-white' : 'text-black'} border-t-2.5 border-black shadow-neo-sm relative`}>
        <div className="flex items-center gap-3">
          {/* Status */}
          <div className="flex items-center gap-2">
            {statusIcon()}
            <span className="neo-badge bg-neo-green text-black px-2 py-0.5 text-[10px]">{statusLabel()}</span>
          </div>

          {/* Room ID */}
          <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1 neo-badge bg-neo-yellow text-black hover:bg-neo-purple transition-all active:translate-x-0.5 active:translate-y-0.5" title="Copy Room ID">
            <span className="tracking-widest font-black">{roomId}</span>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>

          {isHost && <Crown size={16} className="text-amber-400 drop-shadow-[1px_1px_0px_#000]" />}
        </div>

        <div className="flex items-center gap-3">
          {/* Member avatars */}
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="flex items-center gap-2 px-2.5 py-1 border-2 border-black bg-white dark:bg-slate-800 shadow-neo-sm text-black dark:text-white font-bold transition-all active:translate-x-0.5 active:translate-y-0.5 relative"
          >
            <div className="flex -space-x-2">
              {members.slice(0, 5).map(m => (
                <div
                  key={m.peerId}
                  className="w-6 h-6 rounded-none border-2 border-black flex items-center justify-center text-[10px] font-black text-black shadow-neo-sm"
                  style={{ backgroundColor: m.color }}
                  title={m.displayName}
                >
                  {m.displayName[0]?.toUpperCase()}
                </div>
              ))}
              {members.length > 5 && (
                <div className="w-6 h-6 rounded-none border-2 border-black bg-neo-yellow text-black flex items-center justify-center text-[10px] font-black">
                  +{members.length - 5}
                </div>
              )}
            </div>
            <Users size={15} />
            <span className="font-black">{members.length}</span>

            {/* Pending badge */}
            {isHost && pending.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 border-2 border-black bg-neo-pink text-black text-[9px] font-black flex items-center justify-center animate-bounce shadow-neo-sm">
                {pending.length}
              </span>
            )}
          </button>

          {/* Leave button */}
          <button
            onClick={onLeave}
            className="flex items-center gap-1.5 px-3 py-1 border-2 border-black bg-neo-pink text-black hover:bg-red-400 transition-all shadow-neo-sm text-[12px] font-black uppercase active:translate-x-0.5 active:translate-y-0.5"
          >
            <LogOut size={14} /> LEAVE
          </button>
        </div>
      </div>

      {/* ── Members/Pending panel ─────────────────────────────────────── */}
      {hasRendered && (
        <>
          <div className={`fixed inset-0 z-40 transition-opacity duration-300 ease-out ${isActive ? 'opacity-100' : 'opacity-0'}`} onClick={() => setShowPanel(false)} />
          <div className={`absolute bottom-14 right-4 z-50 w-76 ${panelBg} border-2.5 border-black shadow-neo-xl overflow-hidden transition-all duration-300 ease-out transform origin-bottom-right ${isActive ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}>
            <div className="px-4 py-3 border-b-2.5 border-black bg-neo-yellow text-black flex items-center justify-between font-black">
              <h3 className="text-sm uppercase tracking-wide">Room Members</h3>
              <button onClick={() => setShowPanel(false)} className="p-1 border border-black bg-neo-pink text-black hover:bg-red-400 font-bold">
                <X size={14} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {/* Approved members */}
              {members.map(m => (
                <div key={m.peerId} className={`flex items-center gap-3 px-4 py-2.5 border-b border-black/10 ${isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-900'}`}>
                  <div
                    className="w-7 h-7 border-2 border-black flex items-center justify-center text-xs font-black text-black shrink-0 shadow-neo-sm"
                    style={{ backgroundColor: m.color }}
                  >
                    {m.displayName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-bold truncate ${textP}`}>
                      {m.displayName}
                      {m.isHost && <Crown size={12} className="inline ml-1 text-amber-400 drop-shadow-[1px_1px_0px_#000]" />}
                    </div>
                  </div>
                  <Wifi size={12} className="text-green-500 shrink-0" />
                </div>
              ))}

              {/* Pending requests (host only) */}
              {isHost && pending.length > 0 && (
                <>
                  <div className="px-4 py-2 text-[10px] font-black uppercase tracking-wider bg-neo-purple text-black border-t-2 border-black">
                    <Clock size={11} className="inline mr-1" /> Pending Requests
                  </div>
                  {pending.map(p => (
                    <div key={p.peerId} className="flex items-center gap-3 px-4 py-2.5 bg-neo-yellow/30 border-b border-black/10">
                      <div
                        className="w-7 h-7 border-2 border-black flex items-center justify-center text-xs font-black text-black shrink-0 shadow-neo-sm"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.displayName[0]?.toUpperCase()}
                      </div>
                      <span className={`flex-1 text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{p.displayName}</span>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => onApprove(p.peerId)}
                          className="p-1.5 border-2 border-black bg-neo-green text-black hover:bg-green-400 font-bold transition-all active:translate-x-0.5 active:translate-y-0.5 shadow-neo-sm"
                          title="Approve"
                        >
                          <UserCheck size={13} />
                        </button>
                        <button
                          onClick={() => onReject(p.peerId)}
                          className="p-1.5 border-2 border-black bg-neo-pink text-black hover:bg-red-400 font-bold transition-all active:translate-x-0.5 active:translate-y-0.5 shadow-neo-sm"
                          title="Reject"
                        >
                          <UserX size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

