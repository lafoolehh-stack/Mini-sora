export enum GenerationStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING', // Sending request
  POLLING = 'POLLING',       // Waiting for video to render
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface VideoGenerationState {
  status: GenerationStatus;
  videoUrl: string | null;
  error: string | null;
  elapsedSeconds: number;
}
