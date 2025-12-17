import { GoogleGenAI } from "@google/genai";

// We create the client inside the function to ensure we pick up the latest API key
// from process.env.API_KEY which might be injected after the user selects it.

export const generateVeoVideo = async (
  prompt: string, 
  image: { data: string; mimeType: string } | undefined,
  onPoll: (elapsed: number) => void
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing. Please select a valid key.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Using Veo fast preview model for quicker results
    const model = 'veo-3.1-fast-generate-preview';
    
    // Construct request options dynamically based on inputs
    const requestOptions: any = {
      model: model,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    };

    // Prompt is optional if image is provided, but we pass it if it exists.
    if (prompt) {
      requestOptions.prompt = prompt;
    }

    // Add image if provided
    if (image) {
      requestOptions.image = {
        imageBytes: image.data,
        mimeType: image.mimeType
      };
    } else if (!prompt) {
      // If neither prompt nor image is provided (though UI handles this check)
      throw new Error("Please provide a text prompt or an image to generate a video.");
    }
    
    let operation;
    let attempts = 0;
    const maxAttempts = 3;

    // Retry loop for the initial request
    while (attempts < maxAttempts) {
      try {
        operation = await ai.models.generateVideos(requestOptions);
        break; // Success
      } catch (err: any) {
        attempts++;
        console.warn(`Veo generation attempt ${attempts} failed:`, err);
        
        // Don't retry on auth errors (404/403) or bad requests (400)
        const errStr = JSON.stringify(err);
        if (
          errStr.includes("404") || 
          errStr.includes("NOT_FOUND") || 
          errStr.includes("400") || 
          errStr.includes("INVALID_ARGUMENT") ||
          (err.message && (err.message.includes("404") || err.message.includes("400")))
        ) {
          throw err;
        }

        if (attempts === maxAttempts) {
          throw new Error("Failed to connect to Gemini API after multiple attempts. Please check your internet connection and try again.");
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
      }
    }

    const startTime = Date.now();

    // Polling loop
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      onPoll(elapsed);

      // Refresh operation status with simple retry for polling as well
      try {
        operation = await ai.operations.getVideosOperation({ operation: operation });
      } catch (pollErr) {
        console.warn("Polling failed, retrying in next iteration", pollErr);
        // Continue loop, will retry in 5s
      }
    }

    if (operation.error) {
      const opError = operation.error;
      throw new Error(opError.message || "Unknown error during video generation operation");
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      throw new Error("No video URI returned from operation");
    }

    // Fetch the actual video bytes using the URI and the API key
    // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
    const downloadUrl = `${videoUri}&key=${apiKey}`;
    
    const response = await fetch(downloadUrl);
    if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`Failed to download video: ${response.status} - ${errorText}`);
    }
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (error: any) {
    // Suppress console error for known auth issues to keep console clean
    const isAuthError = 
      JSON.stringify(error).includes("404") || 
      JSON.stringify(error).includes("NOT_FOUND") ||
      (error.message && error.message.includes("404"));

    if (!isAuthError) {
        console.error("Veo Generation Error:", error);
    }
    
    let msg = "Veo video generation failed";

    if (error instanceof Error) {
      msg = error.message;
    } else if (typeof error === 'object' && error !== null) {
      // Handle nested error objects from Google APIs
      // Pattern: { error: { code: 404, message: "..." } }
      if ((error as any).error) {
        const inner = (error as any).error;
        if (inner.message) {
            msg = inner.message;
            // Prepend code if available to ensure downstream catch logic finds it
            if (inner.code) {
                msg = `[${inner.code}] ${msg}`;
            }
        }
      } 
      // Pattern: { message: "..." }
      else if ((error as any).message) {
        msg = (error as any).message;
      } 
      else {
        try {
          msg = JSON.stringify(error);
        } catch {
          msg = "Unknown error object structure";
        }
      }
    } else {
      msg = String(error);
    }
    
    throw new Error(msg);
  }
};