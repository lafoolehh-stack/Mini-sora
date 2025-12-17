import React, { useState, useEffect } from 'react';

interface ApiKeySelectorProps {
  onKeySelected: () => void;
  initialError?: string | null;
}

export const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected, initialError }) => {
  const [error, setError] = useState<string | null>(initialError || null);

  // Update local error if prop changes
  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  const handleSelectKey = async () => {
    setError(null);
    try {
      // Use type assertion to avoid TS errors
      const aistudio = (window as any).aistudio;
      if (aistudio && aistudio.openSelectKey) {
        await aistudio.openSelectKey();
        // Assume success if no error thrown, proceed to app
        onKeySelected();
      } else {
        setError("AI Studio environment not detected. Unable to open key selector.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to select API key. Please try again.");
    }
  };

  return (
    <div className="p-8 flex flex-col items-center text-center space-y-6">
      <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-sky-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
        <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
          To generate videos with Veo, please select a paid API key from a valid Google Cloud Project.
        </p>
      </div>

      {error && (
        <div className="w-full p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-xs flex items-start gap-2 text-left animate-in fade-in slide-in-from-top-1">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mt-0.5 flex-shrink-0">
             <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
           </svg>
           <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleSelectKey}
        className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-sky-500/25 active:scale-[0.98]"
      >
        Select API Key
      </button>
      
      <p className="text-xs text-slate-500">
        You will be prompted to choose a project and key.
      </p>
    </div>
  );
};