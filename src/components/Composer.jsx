import React from 'react';
import { Send, Sparkles, Undo2, Image as ImageIcon } from 'lucide-react';

export function Composer({ 
  value, 
  onChange, 
  originalValue,
  onRevert,
  onRewrite, 
  onPost, 
  isRewriting, 
  selectedPersona,
  imagePreview 
}) {
  const isDirty = value !== originalValue;

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-2 px-2">
        <h2 className="text-brand-textSecondary text-xs font-bold uppercase tracking-widest">
          Composer
        </h2>
        {isDirty && (
          <button 
            onClick={onRevert}
            className="text-xs text-brand-textSecondary hover:underline flex items-center gap-1"
          >
            <Undo2 className="w-3 h-3" /> Revert to original
          </button>
        )}
      </div>

      <div className="bg-transparent mb-6">
        <div className={`relative transition-opacity ${isRewriting ? 'opacity-50 pointer-events-none' : ''}`}>
           <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="What's happening?"
            className="w-full bg-transparent text-xl leading-relaxed outline-none resize-none min-h-[150px] placeholder:text-brand-textSecondary/40"
            spellCheck="false"
          />
          {isRewriting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 text-brand-black animate-pulse">
                <Sparkles className="w-5 h-5" />
                <span className="font-medium text-sm">Rewriting in {selectedPersona?.handle || 'persona'}'s voice...</span>
              </div>
            </div>
          )}
        </div>

        {imagePreview && (
          <div className="mt-4 relative group">
            <img 
              src={imagePreview} 
              alt="Post attachment" 
              className="w-full rounded-2xl border border-brand-border object-cover max-h-[400px]"
            />
            <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded text-xs backdrop-blur-md">
              Preview
            </div>
          </div>
        )}
      </div>
      
      <div className="border-t border-brand-border pt-6 flex items-center justify-between">
        <div className="flex gap-4">
          <button
            onClick={onRewrite}
            disabled={!selectedPersona || isRewriting || !value.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-brand-border text-brand-text font-semibold text-sm hover:border-brand-black hover:bg-brand-surface transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-brand-border disabled:hover:bg-transparent"
          >
            <Sparkles className="w-4 h-4" />
            <span>Rewrite</span>
          </button>
        </div>

        <button
          onClick={onPost}
          disabled={!value.trim()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-black text-white font-bold text-sm hover:bg-brand-blackHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Post to X</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      {!selectedPersona && (
        <div className="mt-4 p-3 bg-brand-surface rounded-lg border border-brand-border text-xs text-brand-textSecondary text-center">
          Select a persona from the sidebar to enable rewriting.
        </div>
      )}
    </div>
  );
}
