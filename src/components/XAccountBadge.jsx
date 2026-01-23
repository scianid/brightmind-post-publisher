import React from 'react';
import { LogOut } from 'lucide-react';

export function XAccountBadge({ user, onLogout }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 border border-brand-border 
                    rounded-lg bg-white shadow-sm">
      <img 
        src={user.avatar} 
        alt={user.name}
        className="w-8 h-8 rounded-full"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{user.name}</div>
        <div className="text-xs text-brand-textSecondary">@{user.username}</div>
      </div>
      <button 
        onClick={onLogout}
        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
        title="Logout from X"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
