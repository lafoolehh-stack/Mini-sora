import React, { useState, useRef } from 'react';
import { generateVeoVideo } from '../services/geminiService';
import { GenerationStatus, VideoGenerationState } from '../types';

interface VideoGeneratorProps {
  onResetKey: (reason?: string) => void;
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ onResetKey }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<VideoGenerationState>({
    status: GenerationStatus.IDLE,
    videoUrl: null,
    error: null,
    elapsedSeconds: 0,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleGenerate = async () => {
    // Allow generation if there is a prompt OR an image
    if (!prompt.trim() && !selectedFile) return;

    setState({
      status: GenerationStatus.GENERATING,
      videoUrl: null,
      error: null,
      elapsedSeconds: 0,
    });

    try {
      let imagePayload = undefined;
      
      if (selectedFile) {
        const base64DataUrl = await fileToBase64(selectedFile);
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64String = base64DataUrl.split(',')[1];
        imagePayload = {
          data: base64String,
          mimeType: selectedFile.type
        };
      }

      const url = await generateVeoVideo(prompt, imagePayload, (elapsed) => {
        setState((prev) => ({
          ...prev,
          status: GenerationStatus.POLLING,
          elapsedSeconds: elapsed,
        }));
      });

      setState({
        status: GenerationStatus.COMPLETED,
        videoUrl: url,
        error: null,
        elapsedSeconds: 0,
      });
    } catch (err: any) {
      let errorMessage = "Something went wrong. Please try again.";
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else {
        try {
          errorMessage = JSON.stringify(err);
        } catch {
          errorMessage = "Unknown error occurred";
        }
      }
      
      const lowerCaseMessage = errorMessage.toLowerCase();

      // Check specifically for Veo "not found" error which implies invalid/unpaid key context
      if (
        lowerCaseMessage.includes("requested entity was not found") || 
        lowerCaseMessage.includes("status: 404") ||
        lowerCaseMessage.includes("not_found") ||
        lowerCaseMessage.includes("[404]") ||
        lowerCaseMessage.includes(" 404 ")
      ) {
          // Reset key immediately so user can select a correct paid key
          onResetKey("The previous API Key was invalid or not associated with a paid project required for Veo. Please select a valid paid key.");
          return;
      }

      setState({
        status: GenerationStatus.FAILED,
        videoUrl: null,
        error: errorMessage,
        elapsedSeconds: 0,
      });
    }
  };

  const isLoading = state.status === GenerationStatus.GENERATING || state.status === GenerationStatus.POLLING;
  const hasInput = prompt.trim().length > 0 || selectedFile !== null;

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-900">
      
      {/* Input Section */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-300">
          Describe your video or upload an image
        </label>
        
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl opacity-20 group-focus-within:opacity-100 transition duration-500 blur"></div>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            placeholder="Describe the video you want to generate..."
            className="relative w-full min-h-[100px] bg-slate-950 text-slate-100 border border-slate-800 rounded-xl p-4 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Image Upload / Preview */}
        <div className="flex items-start gap-4">
          {!previewUrl ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              Add Reference Image
            </button>
          ) : (
            <div className="relative group inline-block">
               <div className="w-24 h-24 rounded-xl border border-slate-700 overflow-hidden bg-slate-950">
                 <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
               </div>
               <button
                 onClick={handleRemoveImage}
                 disabled={isLoading}
                 className="absolute -top-2 -right-2 bg-slate-800 text-slate-400 hover:text-red-400 rounded-full p-1 border border-slate-700 shadow-lg transition-colors disabled:opacity-50"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                   <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                 </svg>
               </button>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 px-1">
          <span>{selectedFile ? 'Image + Text' : 'Text only'} mode</span>
          <span>{prompt.length} chars</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleGenerate}
        disabled={isLoading || !hasInput}
        className={`w-full py-4 px-6 rounded-full font-bold text-sm tracking-wide transition-all shadow-xl 
          ${isLoading || !hasInput 
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none' 
            : 'bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white shadow-sky-900/40 active:transform active:scale-[0.99]'
          } flex items-center justify-center gap-2`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {state.status === GenerationStatus.GENERATING ? 'Initializing...' : `Generating (${state.elapsedSeconds}s)`}
          </>
        ) : (
          <>
            <span>🎬</span> Generate Video
          </>
        )}
      </button>

      {/* Status & Error Messages */}
      {state.status === GenerationStatus.FAILED && (
        <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 fade-in">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-sm font-semibold text-red-400">Generation Failed</h4>
            <p className="text-xs text-red-300/70 mt-1 break-words">{state.error}</p>
          </div>
        </div>
      )}

      {/* Video Result */}
      {state.status === GenerationStatus.COMPLETED && state.videoUrl && (
        <div className="mt-6 rounded-2xl overflow-hidden border border-slate-700 bg-black shadow-2xl relative group animate-in fade-in duration-700">
           <div className="absolute top-3 right-3 z-10">
              <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-md border border-green-500/30">
                Completed
              </span>
           </div>
           <video 
             src={state.videoUrl} 
             controls 
             autoPlay 
             loop 
             className="w-full aspect-video object-cover"
           />
           <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
             <div className="text-xs text-slate-400">Generated with Veo</div>
             <a 
               href={state.videoUrl} 
               download={`veo-video-${Date.now()}.mp4`}
               className="text-xs font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 12.75l-3.3-3.3M12 12.75l3.3-3.3M12 12.75V3" />
               </svg>
               Download
             </a>
           </div>
        </div>
      )}

      {/* Placeholder / Waiting State (Visual Only) */}
      {(isLoading) && (
        <div className="mt-6 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex flex-col items-center justify-center text-slate-600 relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/5 to-transparent animate-pulse"></div>
          <div className="z-10 flex flex-col items-center">
             <div className="w-12 h-12 border-4 border-slate-800 border-t-sky-500 rounded-full animate-spin mb-4"></div>
             <p className="text-sm font-medium animate-pulse">Creating masterpiece...</p>
             <p className="text-xs text-slate-600 mt-2">This may take a minute or two.</p>
          </div>
        </div>
      )}
    </div>
  );
};