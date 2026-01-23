import React, { useRef, useEffect, useState } from 'react';
import { Send, Sparkles, Undo2, Image as ImageIcon, ArrowDown, Check, X, Download, Clock } from 'lucide-react';
import { XLoginButton } from './XLoginButton';
import { XAccountBadge } from './XAccountBadge';
import { XPostModal } from './XPostModal';

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
  imagePreview,
  historyIndex,
  historyLength,
  onHistoryNavigate,
  currentHistoryPersona,
  rewriteHistory,
  xUser,
  xAuthLoading,
  onXLogin,
  onXLogout,
  onDirectPost
}) {
  const isDirty = value !== originalValue;
  const suggestionRef = useRef(null);
  const [showHistory, setShowHistory] = useState(false);
  const historyRef = useRef(null);
  const [showXPostModal, setShowXPostModal] = useState(false);
  const [isPostingToX, setIsPostingToX] = useState(false);
  const [postingContext, setPostingContext] = useState({ text: '', image: null });

  useEffect(() => {
    if (suggestionRef.current) {
        suggestionRef.current.style.height = 'auto';
        suggestionRef.current.style.height = suggestionRef.current.scrollHeight + 'px';
    }
  }, [rewrittenValue]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (historyRef.current && !historyRef.current.contains(event.target)) {
        setShowHistory(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDirectPostClick = (text, image) => {
    setPostingContext({ text, image });
    setShowXPostModal(true);
  };

  const handleConfirmDirectPost = async () => {
    setIsPostingToX(true);
    try {
      const result = await onDirectPost(postingContext.text, postingContext.image);
      if (result?.success) {
        setShowXPostModal(false);
        // Show success and optionally open tweet
        const shouldOpen = window.confirm('Posted successfully! Open tweet in new tab?');
        if (shouldOpen && result.tweetUrl) {
          window.open(result.tweetUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Direct post error:', error);
    } finally {
      setIsPostingToX(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full pb-20">
      {/* REWRITTEN SUGGESTION AREA */}
      {rewrittenValue && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300 mb-8 z-10 relative">
           <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-brand-black" />
                <span className="text-xs font-bold uppercase tracking-wider text-brand-black">
                  Suggested from {currentHistoryPersona || selectedPersona?.display_name || 'AI'}
                </span>
              </div>
              
              {historyLength > 1 && rewriteHistory && rewriteHistory.length > 0 && (
                <div className="relative" ref={historyRef}>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-textSecondary hover:text-brand-black hover:bg-brand-surface rounded-lg transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Previous Versions ({historyLength})</span>
                  </button>
                  
                  {showHistory && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-brand-border rounded-xl shadow-xl overflow-hidden z-20">
                      <div className="max-h-80 overflow-y-auto">
                        {rewriteHistory.map((item, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              onHistoryNavigate('goto', index);
                              setShowHistory(false);
                            }}
                            className={`w-full text-left p-4 border-b border-brand-border/50 hover:bg-brand-surface transition-colors ${
                              index === historyIndex ? 'bg-brand-surface' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-brand-black">
                                {item.personaName}
                              </span>
                              {index === historyIndex && (
                                <Check className="w-3.5 h-3.5 text-brand-success" />
                              )}
                            </div>
                            <p className="text-sm text-brand-text line-clamp-2">
                              {item.text}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
           </div>
           
           <div className="bg-[#FAFBFB] rounded-xl border border-brand-border shadow-lg shadow-black/5 relative overflow-hidden group hover:shadow-xl hover:border-brand-text/20 transition-all">
              <textarea 
                ref={suggestionRef}
                value={rewrittenValue}
                onChange={(e) => setRewrittenText(e.target.value)}
                className="w-full bg-transparent text-lg text-brand-black font-medium leading-relaxed outline-none resize-none min-h-[140px] max-h-[300px] overflow-y-auto p-6"
                spellCheck="false"
              />

              {imagePreview && (
                <div className="mx-6 mb-6 relative group">
                  <img 
                    src={imagePreview} 
                    alt="Post attachment" 
                    className="w-full rounded-lg border border-brand-border object-cover max-h-[300px]"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-2">
                    <div className="bg-black/50 text-white px-2 py-0.5 rounded text-[10px] backdrop-blur-md font-medium">
                      Included
                    </div>
                    <a
                      href={imagePreview}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-black/50 hover:bg-black/70 text-white p-1.5 rounded backdrop-blur-md transition-colors"
                      title="Download image"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-brand-border/50 bg-white/50 backdrop-blur-sm">
                <button 
                  onClick={() => setRewrittenText('')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-textSecondary hover:text-brand-error transition-colors uppercase tracking-wide"
                >
                  <X className="w-3.5 h-3.5" />
                  Discard
                </button>
                
                <div className="flex items-center gap-3">
                  {xUser ? (
                    <button 
                      onClick={() => handleDirectPostClick(rewrittenValue, imagePreview)}
                      className="flex items-center gap-2 px-6 py-2 rounded-full bg-brand-black text-white font-bold text-sm hover:bg-brand-blackHover transition-all shadow-md active:translate-y-px"
                    >
                      <span>Post to X</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => onPost(rewrittenValue)}
                      className="flex items-center gap-2 px-6 py-2 rounded-full bg-brand-black text-white font-bold text-sm hover:bg-brand-blackHover transition-all shadow-md active:translate-y-px"
                    >
                      <span>Post to X</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
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
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
              <div className="flex flex-col items-center gap-3 bg-white border-2 border-brand-black text-brand-black px-6 py-4 rounded-2xl shadow-xl">
                <Sparkles className="w-6 h-6 animate-spin" />
                <span className="font-semibold text-base">Rewriting in {selectedPersona?.handle || 'persona'}'s voice...</span>
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
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <div className="bg-black/50 text-white px-2 py-1 rounded text-xs backdrop-blur-md">
                Preview
              </div>
              <a
                href={imagePreview}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black/50 hover:bg-black/70 text-white p-2 rounded backdrop-blur-md transition-colors"
                title="Download image"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </div>
      
      {/* MAIN ACTIONS */}
      <div className="border-t border-brand-border pt-6 mb-8">
        {/* X Authentication Section */}
        <div className="mb-4">
          {!xUser ? (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-brand-border">
              <div className="flex-1">
                <p className="text-sm font-medium text-brand-text mb-1">
                  Post directly to X
                </p>
                <p className="text-xs text-brand-textSecondary">
                  Login to post with images and skip the X intent dialog
                </p>
              </div>
              <XLoginButton onLogin={onXLogin} isLoading={xAuthLoading} />
            </div>
          ) : (
            <div className="mb-3">
              <XAccountBadge user={xUser} onLogout={onXLogout} />
            </div>
          )}
        </div>

        {/* Post Buttons */}
        <div className="flex items-center justify-between gap-3">
          {xUser ? (
            <>
              <button
                onClick={() => onPost()}
                disabled={!value.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-brand-border text-brand-text font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Use X Intent</span>
              </button>
              <button
                onClick={() => handleDirectPostClick(value, imagePreview)}
                disabled={!value.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-brand-black text-white font-bold text-sm hover:bg-brand-blackHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Post Directly</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => onPost()}
              disabled={!value.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-brand-black text-white font-bold text-sm hover:bg-brand-blackHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Post to X</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* X Post Modal */}
      {xUser && (
        <XPostModal 
          isOpen={showXPostModal}
          onClose={() => setShowXPostModal(false)}
          onConfirm={handleConfirmDirectPost}
          postText={postingContext.text}
          image={postingContext.image}
          xUser={xUser}
          isPosting={isPostingToX}
        />
      )}

      {!selectedPersona && !rewrittenValue && (
        <div className="mt-4 p-3 bg-brand-surface rounded-lg border border-brand-border text-xs text-brand-textSecondary text-center">
          Select a persona from the sidebar to enable rewriting.
        </div>
      )}
    </div>
  );
}
