import React, { useState, useEffect, useRef } from 'react';
import { ApiKeyModal } from './components/ApiKeyModal';
import { PersonaSidebar } from './components/PersonaSidebar';
import { Composer } from './components/Composer';

const API_BASE = 'https://app.brightmind-community.com';

function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('BO_API_KEY') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState(null);
  
  const [postText, setPostText] = useState('');
  const [originalPostText, setOriginalPostText] = useState('');
  const [rewrittenText, setRewrittenText] = useState('');
  const [rewriteHistory, setRewriteHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [image, setImage] = useState('');
  
  const [isRewriting, setIsRewriting] = useState(false);
  const isInitialMount = useRef(true);
  const hasAutoRewritten = useRef(false);

  // Initialize from URL and LocalStorage
  useEffect(() => {
    // URL Params
    const params = new URLSearchParams(window.location.search);
    const initialPost = params.get('post') || '';
    const initialImage = params.get('image') || '';
    
    setPostText(initialPost);
    setOriginalPostText(initialPost);
    setImage(initialImage);

    // Auto-validate if key exists
    if (apiKey) {
      validateKey(apiKey);
    }
  }, []);

  // Auto-rewrite on load if there's text and a persona is selected
  useEffect(() => {
    if (selectedPersona && postText.trim() && !hasAutoRewritten.current && isAuthenticated) {
      hasAutoRewritten.current = true;
      handleRewrite(selectedPersona, postText);
    }
  }, [selectedPersona, isAuthenticated]);

  // Update URL params when postText changes (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    const params = new URLSearchParams();
    if (postText) {
      params.set('post', postText);
    }
    if (image) {
      params.set('image', image);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [postText, image]);

  const validateKey = async (key) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/personas/list`, {
        headers: {
          'X-API-Key': key,
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) throw new Error('Invalid API Key');
      
      const data = await res.json();
      const fetchedPersonas = data.personas || [];
      setPersonas(fetchedPersonas);
      setApiKey(key);
      localStorage.setItem('BO_API_KEY', key);
      setIsAuthenticated(true);

      // Default selection logic
      if (fetchedPersonas.length > 0) {
        const defaultId = "725608553332006912"; // Ella Kenan
        const found = fetchedPersonas.find(p => p.account_id === defaultId);
        if (found) {
          setSelectedPersona(found);
        } else {
          setSelectedPersona(fetchedPersonas[0]);
        }
      }
    } catch (err) {
      console.error("Auth Error:", err);
      // differentiate error messages
      if (err.message === 'Invalid API Key') {
        setAuthError('Invalid API Key. Please check your credentials.');
      } else {
        setAuthError(`Connection error: ${err.message}`);
      }
      
      setIsAuthenticated(false);
      localStorage.removeItem('BO_API_KEY'); 
      setApiKey('');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRewrite = async (persona, text) => {
    // Use provided params or fall back to current state
    const personaToUse = persona || selectedPersona;
    const textToUse = text || postText;
    
    if (!personaToUse || !textToUse.trim()) return;
    
    setIsRewriting(true);
    try {
      const res = await fetch(`${API_BASE}/personas/${personaToUse.account_id}/chat`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Rewrite the following social media post in your specific voice and style. strictly output only the rewritten text nothing else:\n\n${textToUse}`,
          stream: false,
          include_debug: false
        })
      });

      if (!res.ok) throw new Error('Rewrite failed');

      const data = await res.json();
      // The Spec says response body for non-streaming is: { success: true, response: "...", ... }
      if (data.response) {
        setRewrittenText(data.response);
        
        // Add to history
        const newHistoryEntry = {
          text: data.response,
          personaId: personaToUse.account_id,
          personaName: personaToUse.display_name,
          timestamp: Date.now()
        };
        
        // If we're not at the end of history, remove everything after current position
        const newHistory = historyIndex >= 0 
          ? [...rewriteHistory.slice(0, historyIndex + 1), newHistoryEntry]
          : [...rewriteHistory, newHistoryEntry];
        
        setRewriteHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    } catch (err) {
      alert('Failed to rewrite post. Please try again.');
      console.error(err);
    } finally {
      setIsRewriting(false);
    }
  };

  const handleHistoryNavigate = (direction, index) => {
    let newIndex;
    if (direction === 'goto') {
      newIndex = index;
    } else {
      newIndex = direction === 'back' ? historyIndex - 1 : historyIndex + 1;
    }
    if (newIndex >= 0 && newIndex < rewriteHistory.length) {
      setHistoryIndex(newIndex);
      setRewrittenText(rewriteHistory[newIndex].text);
    }
  };

  const handlePersonaSelect = (persona) => {
    setSelectedPersona(persona);
    // Automatically trigger rewrite if there's text
    if (postText.trim()) {
      handleRewrite(persona, postText);
    }
  };

  const handlePost = (textToPost) => {
    // If textToPost argument is provided, use it. Otherwise use main postText.
    const finalContent = typeof textToPost === 'string' ? textToPost : postText;
    const text = encodeURIComponent(finalContent);
    const url = `https://x.com/intent/post?text=${text}`;
    window.open(url, '_blank');
  };

  const handleApplyRewrite = () => {
    setPostText(rewrittenText);
    setRewrittenText(''); // Clear suggestion after applying
  };

  const handleRevert = () => {
    setPostText(originalPostText);
  };

  if (!isAuthenticated && !authLoading && !apiKey) {
    return (
      <ApiKeyModal 
        onValidate={validateKey} 
        isLoading={authLoading} 
        error={authError} 
      />
    );
  }

  // If loading initially with a key, show a minimal loading state or the modal with loading
  if (!isAuthenticated && authLoading) {
     return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-black/20 border-t-brand-black rounded-full animate-spin"></div>
        </div>
     )
  }
    
  // Also show modal if auth failed even if we had a key (it was cleared in catch block, so this might redundantly show modal above, 
  // but if we are in a 'has key but failed' state we need to handle it. 
  // currently validateKey clears api key on fail, so it falls back to first block.
  // Ideally we show the modal WITH the error if validKey was called from the modal itself.
  // If called from mount (auto-login), and fails, we want to show the modal with error.
  
  // Refined auth rendering:
  if (!isAuthenticated) {
      return (
        <ApiKeyModal 
            onValidate={validateKey} 
            isLoading={authLoading} 
            error={authError} 
        />
      );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans p-6 md:p-10">
      <div className="max-w-[1000px] mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-black rounded-lg"></div>
            <h1 className="text-xl font-semibold tracking-tight">BrightMind Publisher</h1>
          </div>
          <button 
            onClick={() => {
                localStorage.removeItem('BO_API_KEY');
                window.location.reload();
            }}
            className="text-sm font-medium text-brand-textSecondary hover:text-brand-black transition-colors"
          >
            Logout
          </button>
        </header>

        <main className="flex flex-col md:flex-row gap-12">
          <PersonaSidebar 
            personas={personas} 
            selectedId={selectedPersona?.account_id}
            onSelect={handlePersonaSelect}
          />
          
          <Composer 
            value={postText}
            onChange={setPostText}
            rewrittenValue={rewrittenText}
            onApplyRewrite={handleApplyRewrite}
            setRewrittenText={setRewrittenText}
            originalValue={originalPostText}
            onRevert={handleRevert}
            onRewrite={handleRewrite}
            onPost={handlePost}
            isRewriting={isRewriting}
            selectedPersona={selectedPersona}
            imagePreview={image}
            historyIndex={historyIndex}
            historyLength={rewriteHistory.length}
            onHistoryNavigate={handleHistoryNavigate}
            currentHistoryPersona={historyIndex >= 0 ? rewriteHistory[historyIndex]?.personaName : null}
            rewriteHistory={rewriteHistory}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
