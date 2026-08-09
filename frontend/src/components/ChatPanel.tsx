/**
 * ChatPanel — Side panel for room text chat.
 * Themed to match the app's dark/light mode.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { ChatMessage } from '../services/collabService';

interface ChatPanelProps {
  isOpen: boolean;
  messages: ChatMessage[];
  selfPeerId: string;
  onSendMessage: (text: string) => void;
  onClose?: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  messages,
  selfPeerId,
  onSendMessage,
  onClose,
}) => {
  const { isDark } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Theme tokens — match Neo-Brutalism palette
  const panelBg = isDark ? 'bg-[#181C2A]' : 'bg-[#FAF7F0]';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';


  return (
    <div 
      className={`shrink-0 overflow-hidden fixed md:relative right-0 top-0 bottom-0 z-40 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none md:pointer-events-auto'}`}
      style={{
        width: isOpen ? 'clamp(280px, 100vw, 300px)' : 0,
        transition: 'width 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        willChange: 'width',
        contain: 'strict',
      }}
    >
      {/* Inner: GPU-composited slide via transform */}
      <div 
        className={`flex flex-col h-full w-[280px] sm:w-[300px] border-l-2.5 border-black ${panelBg} shadow-neo-lg`}
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          opacity: isOpen ? 1 : 0,
          transition: 'transform 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 200ms ease',
          willChange: 'transform, opacity',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2.5 border-black bg-neo-yellow text-black font-black shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-black" />
            <h2 className="text-xs font-black uppercase tracking-wider text-black">Room Chat</h2>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="md:hidden p-1 border border-black bg-neo-pink text-black hover:bg-red-400 font-bold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {messages.length === 0 && (
            <div className={`flex flex-col items-center justify-center h-full py-8 font-bold ${isDark ? 'text-white/60' : 'text-black/60'}`}>
              <MessageSquare size={28} className="mb-2 opacity-60" />
              <p className="text-xs font-black uppercase tracking-wide">No Messages Yet</p>
              <p className={`text-[10px] mt-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Say hello to your collaborators!</p>
            </div>
          )}
          {messages.map((msg) => {
            const isSelf = msg.peerId === selfPeerId;
            return (
              <div key={msg.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 mb-1 mx-1">
                  {!isSelf && (
                    <div
                      className="w-4 h-4 border border-black flex items-center justify-center text-[8px] font-black text-black shrink-0 shadow-neo-sm"
                      style={{ backgroundColor: msg.color }}
                    >
                      {msg.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className={`text-[10px] font-black uppercase ${isSelf ? (isDark ? 'text-neo-purple' : 'text-neo-yellow') : textMuted}`}>
                    {isSelf ? 'You' : msg.displayName}
                  </span>
                  <span className={`text-[9px] font-bold ${textMuted} opacity-70`}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                <div
                  className={`px-3 py-2 border-2 border-black text-[12px] max-w-[85%] font-bold leading-relaxed shadow-neo-sm ${
                    isSelf
                      ? 'bg-neo-purple text-black'
                      : 'bg-white dark:bg-slate-800 text-black dark:text-white'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={`p-3 border-t-2.5 border-black shrink-0 ${isDark ? 'bg-[#12131C]' : 'bg-white'}`}>
          <form onSubmit={handleSend} className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              className="w-full pl-3 pr-10 py-2 border-2 border-black shadow-neo-sm text-[12px] font-bold outline-none bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-500 focus:bg-neo-yellow/20"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 border-1.5 border-black transition-all ${
                !inputValue.trim()
                  ? 'opacity-30 cursor-not-allowed bg-slate-300'
                  : 'bg-neo-green text-black hover:bg-neo-yellow active:translate-x-0.5 active:translate-y-0.5 shadow-neo-sm'
              }`}
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

