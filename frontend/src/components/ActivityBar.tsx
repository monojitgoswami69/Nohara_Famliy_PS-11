/**
 * ActivityBar — VS Code-style left vertical icon strip.
 * Provides quick-access toggles for Files, Search, Git, and Settings.
 */

import React from 'react';
import { Files, Search, GitBranch, Settings2, Users } from 'lucide-react';

export type ActivityPanel = 'files' | 'search' | 'git' | 'settings' | null;

interface ActivityBarProps {
  activePanel: ActivityPanel;
  onPanelChange: (panel: ActivityPanel) => void;
  isDark: boolean;
  isInRoom: boolean;
}

interface NavItem {
  id: ActivityPanel;
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
  bottom?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'files', icon: Files, label: 'Explorer' },
  { id: 'search', icon: Search, label: 'Find & Replace' },
  { id: 'git', icon: GitBranch, label: 'Source Control' },
];

const BOTTOM_ITEMS: NavItem[] = [
  { id: 'settings', icon: Settings2, label: 'Settings', bottom: true },
];

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activePanel,
  onPanelChange,
  isDark,
  isInRoom,
}) => {
  const bg = isDark ? 'bg-[#141724]' : 'bg-[#E0DDD6]';
  const activeBg = isDark ? 'bg-neo-yellow/20' : 'bg-neo-yellow/40';
  const activeBorder = 'border-l-2 border-neo-yellow';
  const hoverBg = isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-300/60';
  const iconColor = isDark ? 'text-slate-400' : 'text-slate-600';
  const activeIconColor = isDark ? 'text-neo-yellow' : 'text-slate-900';

  const renderItem = (item: NavItem) => {
    const isActive = activePanel === item.id;
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        title={item.label}
        onClick={() => onPanelChange(isActive ? null : item.id)}
        className={`relative w-full flex items-center justify-center py-3 transition-all group
          ${isActive ? `${activeBg} ${activeBorder}` : `border-l-2 border-transparent ${hoverBg}`}
        `}
      >
        <Icon
          size={22}
          className={`transition-colors ${isActive ? activeIconColor : `${iconColor} group-hover:text-slate-200`}`}
        />
        {/* Tooltip */}
        <span className={`absolute left-full ml-2 px-2 py-1 text-[10px] font-black uppercase tracking-wider whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity border-2 border-black shadow-neo-sm
          ${isDark ? 'bg-[#1E1E2A] text-white' : 'bg-white text-black'}`}>
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <div className={`flex flex-col w-12 shrink-0 border-r-2 border-black ${bg} z-10`}>
      {/* Top items */}
      <div className="flex flex-col mt-1">
        {NAV_ITEMS.map(renderItem)}
        {isInRoom && renderItem({ id: null as any, icon: Users, label: 'Collab Active' })}
      </div>

      {/* Bottom items */}
      <div className="flex flex-col mt-auto mb-1">
        {BOTTOM_ITEMS.map(renderItem)}
      </div>
    </div>
  );
};
