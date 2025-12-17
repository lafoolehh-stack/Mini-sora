import React, { useState, useEffect } from 'react';
import { ApiKeySelector } from './components/ApiKeySelector';
import { VideoGenerator } from './components/VideoGenerator';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [checkingKey, setCheckingKey] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const checkKey = async () => {
    try {
      // Safe access using casting to avoid type conflicts with existing global declarations
      const aistudio = (window as any).aistudio;
      if (aistudio && aistudio.hasSelectedApiKey) {
        const selected = await aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        setHasKey(false);
      }
    } catch (e) {
      console.error("Error checking API key status", e);
      setHasKey(false);
    } finally {
      setCheckingKey(false);
    }
  };

  useEffect(() => {
    checkKey();
  }, []);

  const handleKeySelected = () => {
    setAuthError(null);
    setHasKey(true);
  };

  const handleResetKey = (reason?: string) => {
    setAuthError(reason || "Please select a valid API key.");
    setHasKey(false);
  };

  if (checkingKey) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg">
        <header className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-xl shadow-lg shadow-sky-500/20">
            <span>🎥</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-sky-200">
              Mini Sora (Veo)
            </h1>
            <p className="text-sm text-slate-400">Next-gen AI Video Creation</p>
          </div>
        </header>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-1">
          {!hasKey ? (
            <ApiKeySelector 
              onKeySelected={handleKeySelected} 
              initialError={authError}
            />
          ) : (
            <VideoGenerator onResetKey={handleResetKey} />
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Powered by Google Gemini Veo • 
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="ml-1 text-slate-400 hover:text-sky-400 transition-colors">
              Billing Information
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;