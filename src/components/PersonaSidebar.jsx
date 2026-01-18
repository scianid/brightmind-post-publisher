import React from 'react';
import { User, Check } from 'lucide-react';

export function PersonaSidebar({ personas, selectedId, onSelect }) {
  return (
    <aside className="w-full md:w-[300px] flex-shrink-0 flex flex-col gap-6">
      <div>
        <h2 className="text-brand-textSecondary text-xs font-bold uppercase tracking-widest mb-4 px-2">
          Select Voice
        </h2>
        
        <div className="flex flex-col gap-1">
          {personas.map((persona) => (
            <button
              key={persona.account_id}
              onClick={() => onSelect(persona)}
              className={`group flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                selectedId === persona.account_id
                  ? 'bg-brand-black text-white shadow-md'
                  : 'hover:bg-brand-surface text-brand-text'
              }`}
            >
              <div className="relative">
                {persona.avatar_url ? (
                  <img 
                    src={persona.avatar_url} 
                    alt={persona.handle}
                    className="w-10 h-10 rounded-full object-cover border border-white/10" 
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedId === persona.account_id ? 'bg-white/10' : 'bg-brand-surface border border-brand-border'
                  }`}>
                    <User className="w-5 h-5 opacity-50" />
                  </div>
                )}
                {selectedId === persona.account_id && (
                  <div className="absolute -bottom-1 -right-1 bg-brand-success text-white p-0.5 rounded-full border-2 border-brand-black">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${
                  selectedId === persona.account_id ? 'text-white' : 'text-brand-text'
                }`}>
                  {persona.display_name}
                </p>
                <p className={`text-sm truncate ${
                  selectedId === persona.account_id ? 'text-white/60' : 'text-brand-textSecondary'
                }`}>
                  @{persona.handle}
                </p>
              </div>
            </button>
          ))}

          {personas.length === 0 && (
            <div className="text-center p-8 border border-dashed border-brand-border rounded-xl">
              <p className="text-brand-textSecondary text-sm">No personas found</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
