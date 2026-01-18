import React, { useState } from 'react';
import { Key } from 'lucide-react';

export function ApiKeyModal({ onValidate, isLoading, error }) {
  const [key, setKey] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (key.trim()) {
      onValidate(key.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-brand-border p-8">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="bg-brand-surface p-3 rounded-full mb-4">
            <Key className="w-6 h-6 text-brand-black" />
          </div>
          <h2 className="text-xl font-semibold text-brand-text mb-2">Access BrightMind</h2>
          <p className="text-brand-textSecondary text-sm">
            Enter your API Key to access the publisher.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-3 text-lg bg-transparent border-b-2 border-brand-border focus:border-brand-black outline-none transition-colors placeholder:text-brand-textSecondary/50 text-center font-mono"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-brand-error text-sm text-center animate-pulse">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !key}
            className="w-full bg-brand-black hover:bg-brand-blackHover text-white font-semibold py-3 px-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              'Enter'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
