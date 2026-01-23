import React, { useState, useEffect, useRef } from 'react';
import { ApiKeyModal } from './components/ApiKeyModal';
import { PersonaSidebar } from './components/PersonaSidebar';
import { Composer } from './components/Composer';

const API_BASE = 'https://app.brightmind-community.com';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

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

  // X (Twitter) Authentication State
  const [xUser, setXUser] = useState(null);
  const [xAuthLoading, setXAuthLoading] = useState(false);

  // Initialize from URL and LocalStorage
  useEffect(() => {
    // URL Params
    const params = new URLSearchParams(window.location.search);
    const initialPost = params.get('post') || '';
    const initialImage = params.get('image') || '';
    
    setPostText(initialPost);
    setOriginalPostText(initialPost);
    setImage(initialImage);


    // Check for X OAuth callback
    const code = params.get('code');
    const state = params.get('state');
    if (code && state) {
      handleXCallback(code, state);
    } else {
      // Restore X user from local storage (persistent across refreshes)
      const storedXUser = localStorage.getItem('x_user');
      const storedToken = localStorage.getItem('x_access_token');
      if (storedXUser && storedToken) {
        try {
          setXUser(JSON.parse(storedXUser));
          // Token validation will happen automatically when user tries to post
          // No need to validate immediately on page load
        } catch (e) {
          console.error('Failed to parse stored X user:', e);
          // Clear invalid data
          localStorage.removeItem('x_user');
          localStorage.removeItem('x_access_token');
          localStorage.removeItem('x_refresh_token');
        }
      }
    }
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

  // Validate X token and handle refresh if needed
  const validateXToken = async (accessToken) => {
    try {
      const userResponse = await fetch(`${BACKEND_URL}/api/x/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!userResponse.ok) {
        // Token might be expired, try to refresh
        const refreshToken = localStorage.getItem('x_refresh_token');
        if (refreshToken) {
          await refreshXToken(refreshToken);
        } else {
          throw new Error('Token invalid and no refresh token available');
        }
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      // Clear invalid tokens
      localStorage.removeItem('x_user');
      localStorage.removeItem('x_access_token');
      localStorage.removeItem('x_refresh_token');
      localStorage.removeItem('x_client_id');
      setXUser(null);
    }
  };

  // Refresh X token
  const refreshXToken = async (refreshToken) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/x/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      const { accessToken, refreshToken: newRefreshToken } = await response.json();
      
      // Update stored tokens
      localStorage.setItem('x_access_token', accessToken);
      if (newRefreshToken) {
        localStorage.setItem('x_refresh_token', newRefreshToken);
      }
      
      console.log('Token refreshed successfully');
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
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

  // X (Twitter) Authentication Handlers
  const handleXLogin = async () => {
    setXAuthLoading(true);
    try {
      // Get OAuth config from backend
      const response = await fetch(`${BACKEND_URL}/api/x/auth/config`);
      
      if (!response.ok) {
        throw new Error('Failed to get X OAuth config');
      }
      
      const { clientId } = await response.json();
      
      // Store client ID for later use (logout)
      localStorage.setItem('x_client_id', clientId);
      
      // Generate PKCE challenge on client
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      
      // Generate state for CSRF protection
      const state = generateRandomString(32);
      
      // Store verifier and state for callback
      localStorage.setItem('x_code_verifier', codeVerifier);
      localStorage.setItem('x_state', state);
      
      // Build authorization URL with client as redirect URI
      const redirectUri = window.location.origin;
      const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('scope', 'tweet.read tweet.write users.read offline.access');
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('code_challenge', codeChallenge);
      authUrl.searchParams.append('code_challenge_method', 'S256');
      
      // Redirect to X authorization
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('X login failed:', error);
      alert('Failed to start X login. Please try again.');
      setXAuthLoading(false);
    }
  };

  // PKCE Helper Functions
  function generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64URLEncode(array);
  }

  async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return base64URLEncode(new Uint8Array(hash));
  }

  function base64URLEncode(buffer) {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  function generateRandomString(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  const handleXCallback = async (code, state) => {
    const storedState = localStorage.getItem('x_state');
    const codeVerifier = localStorage.getItem('x_code_verifier');
    
    // Validate state to prevent CSRF
    if (state !== storedState) {
      console.error('State mismatch - potential CSRF attack');
      alert('Authentication failed. Please try again.');
      return;
    }
    
    setXAuthLoading(true);
    try {
      // Get client ID from backend
      const configResponse = await fetch(`${BACKEND_URL}/api/x/auth/config`);
      if (!configResponse.ok) {
        throw new Error('Failed to get OAuth config');
      }
      const { clientId } = await configResponse.json();
      
      // Exchange code for token via backend (to avoid CORS)
      const redirectUri = window.location.origin;
      const tokenResponse = await fetch(`${BACKEND_URL}/api/x/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          codeVerifier,
          redirectUri
        }),
      });
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.message || 'Token exchange failed');
      }
      
      const { accessToken, refreshToken, expiresIn } = await tokenResponse.json();
      
      // Get user info from backend using the access token
      const userResponse = await fetch(`${BACKEND_URL}/api/x/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user info');
      }
      
      const { user } = await userResponse.json();
      
      // Store tokens and user info in localStorage (persistent)
      localStorage.setItem('x_access_token', accessToken);
      localStorage.setItem('x_refresh_token', refreshToken);
      localStorage.setItem('x_user', JSON.stringify(user));
      localStorage.setItem('x_client_id', clientId);
      setXUser(user);
      
      // Clean up temporary auth data and redirect
      localStorage.removeItem('x_state');
      localStorage.removeItem('x_code_verifier');
      window.history.replaceState({}, '', window.location.pathname);
      
    } catch (error) {
      console.error('X callback handling failed:', error);
      alert(`Failed to complete X login: ${error.message}`);
    } finally {
      setXAuthLoading(false);
    }
  };

  const handleXLogout = async () => {
    const accessToken = localStorage.getItem('x_access_token');
    const clientId = localStorage.getItem('x_client_id');
    
    try {
      // Revoke token directly with X API
      if (accessToken && clientId) {
        await fetch('https://api.twitter.com/2/oauth2/revoke', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: accessToken,
            client_id: clientId,
            token_type_hint: 'access_token'
          })
        });
      }
    } catch (error) {
      console.error('X logout failed:', error);
    } finally {
      // Clear local storage regardless
      localStorage.removeItem('x_access_token');
      localStorage.removeItem('x_refresh_token');
      localStorage.removeItem('x_user');
      localStorage.removeItem('x_client_id');
      setXUser(null);
    }
  };

  const handleDirectPost = async (textToPost, imageUrl) => {
    const accessToken = localStorage.getItem('x_access_token');
    
    if (!accessToken) {
      alert('Please login to X first');
      return;
    }

    const finalContent = typeof textToPost === 'string' ? textToPost : postText;
    
    console.log('Posting to backend:', BACKEND_URL);
    console.log('Endpoint:', imageUrl ? 'with-media' : 'text-only');
    
    try {
      const endpoint = imageUrl 
        ? `${BACKEND_URL}/api/x/post/with-media`
        : `${BACKEND_URL}/api/x/post`;

      const body = imageUrl
        ? { text: finalContent, imageUrl }
        : { text: finalContent };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error('Post failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        // Handle 403 Forbidden specifically for media uploads
        if (response.status === 403 && imageUrl) {
          const useWebIntent = window.confirm(
            'Media upload is not available with your Twitter API access tier.\n\n' +
            'Would you like to post using Twitter\'s web interface instead?\n' +
            '(Note: You\'ll need to manually attach the image)'
          );
          
          if (useWebIntent) {
            // Fallback to web intent
            const text = encodeURIComponent(finalContent);
            const url = `https://x.com/intent/post?text=${text}`;
            window.open(url, '_blank');
          }
          
          return { success: false };
        }
        
        // Handle 403 for text-only posts
        if (response.status === 403) {
          alert('Permission denied. Your X access token may not have write permissions. Please log out and log back in to X to refresh your token.');
          return { success: false };
        }
        
        throw new Error(errorData.message || `Failed to post (${response.status})`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          tweetId: result.tweetId,
          tweetUrl: result.tweetUrl
        };
      }
    } catch (error) {
      console.error('Failed to post to X:', error);
      
      // Handle token expiration
      if (error.message.includes('expired') || error.message.includes('Unauthorized')) {
        alert('Your X session has expired. Please log in again.');
        handleXLogout();
      } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        alert(`Cannot connect to backend server at ${BACKEND_URL}. Please check if the server is running.`);
      } else {
        alert(`Failed to post: ${error.message}`);
      }
      return { success: false };
    }
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
            xUser={xUser}
            xAuthLoading={xAuthLoading}
            onXLogin={handleXLogin}
            onXLogout={handleXLogout}
            onDirectPost={handleDirectPost}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
