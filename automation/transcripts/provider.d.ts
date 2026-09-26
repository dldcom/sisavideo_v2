export interface TranscriptSegment { start: number; duration: number; text: string }
export interface TranscriptResult { videoId: string; language: string; source: 'manual' | 'auto'; segments: TranscriptSegment[] }
export interface TranscriptProvider { getTranscript(videoId: string): Promise<TranscriptResult | null> }
