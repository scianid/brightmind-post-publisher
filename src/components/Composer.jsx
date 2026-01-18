import React, { useRef, useEffect } from 'react';
import { Send, Sparkles, Undo2, Image as ImageIcon, ArrowDown, Check, X } from 'lucide-react';

export function Composer({ 
  value, 
  onChange, 
  rewrittenValue,
  onApplyRewrite,
  setRewrittenText,
  originalValue,
  onRevert,
  onRewrite, 
  onPost, 
  isRewriting, 
  selectedPersona,
  imagePreview 
}) {
  const isDirty = value !== originalValue;
  const suggestionRef = useRef(null);

  useEffect(() => {
    if (suggestionRef.current) {
        suggestionRef.current.style.height = 'auto';
        suggestionRef.current.style.height = suggestionRef.current.scrollHeight + 'px';
    }
  }, [rewrittenValue]);

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full pb-20">
      {/* REWRITTEN SUGGESTION AREA */}
      {rewrittenValue && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300 mb-8 z-10 relative">
           <div className="flex items-center gap-2 mb-3 px-2">
              <Sparkles className="w-3.5 h-3.5 text-brand-black" />
              <span className="text-xs font-bold uppercase tracking-wider text-brand-black">Suggested from {selectedPersona?.display_name || 'AI'}</span>
           </div>
           
           <div className="bg-[#FAFBFB] rounded-xl border border-brand-border shadow-lg shadow-black/5 relative overflow-hidden group hover:shadow-xl hover:border-brand-text/20 transition-all">
              <textarea 
                ref={suggestionRef}
                value={rewrittenValue}
                onChange={(e) => setRewrittenText(e.target.value)}
                className="w-full bg-transparent text-lg text-brand-black font-medium leading-relaxed outline-none resize-none min-h-[140px] max-h-[300px] overflow-y-auto p-6"
                spellCheck="false"
              />

              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-brand-border/50 bg-white/50 backdrop-blur-sm">
                <button 
                  onClick={() => setRewrittenText('')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-textSecondary hover:text-brand-error transition-colors uppercase tracking-wide"
                >
                  <X className="w-3.5 h-3.5" />
                  Discard
                </button>
                
                <div className="flex items-center gap-3">
                    <button 
                    onClick={() => onPost(rewrittenValue)}
                    className="flex items-center gap-2 px-6 py-2 rounded-full bg-brand-black text-white font-bold text-sm hover:bg-brand-blackHover transition-all shadow-md active:translate-y-px"
                    >
                    <span>Post to X</span>
                    <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* HEADER */}
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

      {/* MAIN INPUT */}
      <div className={`transition-all duration-500 ease-in-out ${rewrittenValue ? 'opacity-40 grayscale-[0.5] scale-[0.99] translate-y-2' : ''} mb-6`}>
        <div className={`relative transition-opacity ${isRewriting ? 'opacity-50 pointer-events-none' : ''}`}>
           <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="What's happening?"
            className="w-full bg-transparent text-xl leading-relaxed outline-none resize-none min-h-[300px] placeholder:text-brand-textSecondary/40"
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
      
      {/* MAIN ACTIONS */}
      <div className="border-t border-brand-border pt-6 flex items-center justify-between mb-8">
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
          onClick={() => onPost()}
          disabled={!value.trim()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-black text-white font-bold text-sm hover:bg-brand-blackHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Post to X</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      {!selectedPersona && !rewrittenValue && (
        <div className="mt-4 p-3 bg-brand-surface rounded-lg border border-brand-border text-xs text-brand-textSecondary text-center">
          Select a persona from the sidebar to enable rewriting.
        </div>
      )}
    </div>
  );
}
