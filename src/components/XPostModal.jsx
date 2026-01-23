import React from 'react';
import { X } from 'lucide-react';

export function XPostModal({ isOpen, onClose, onConfirm, postText, image, xUser, isPosting }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Confirm Post to X</h3>
          <button 
            onClick={onClose} 
            disabled={isPosting}
            className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-brand-textSecondary mb-3">
            Posting as @{xUser.username}
          </p>
          
          <div className="border border-brand-border rounded-lg p-4 bg-gray-50">
            <p className="text-sm whitespace-pre-wrap break-words">{postText}</p>
            {image && (
              <img 
                src={image} 
                alt="Post attachment" 
                className="mt-3 rounded-lg max-h-64 w-full object-cover"
              />
            )}
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            disabled={isPosting}
            className="flex-1 px-4 py-2.5 border border-brand-border rounded-lg
                       hover:bg-gray-50 transition-colors font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            disabled={isPosting}
            className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg
                       hover:bg-gray-800 transition-colors font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {isPosting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Posting...
              </>
            ) : (
              'Post to X'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
