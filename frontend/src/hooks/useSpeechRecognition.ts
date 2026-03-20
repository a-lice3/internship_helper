import { useCallback, useRef, useState } from "react";
import { transcribeAudio } from "../api";

/**
 * Hook that records audio via MediaRecorder and transcribes it
 * using Voxtral (via the backend /transcribe-audio endpoint).
 */
export function useSpeechRecognition(_language?: string) {
  void _language;
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(500);
      setIsRecording(true);
    } catch {
      console.error("Microphone access denied");
    }
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  /** Stop recording and send audio to Voxtral for transcription. */
  const stopAndTranscribe = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        // No recording — return empty
        setIsRecording(false);
        resolve("");
        return;
      }

      recorder.onstop = async () => {
        // Cleanup stream
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
        setIsRecording(false);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];

        if (blob.size === 0) {
          resolve("");
          return;
        }

        setIsTranscribing(true);
        try {
          const text = await transcribeAudio(blob);
          resolve(text);
        } catch (err) {
          console.error("Voxtral transcription failed:", err);
          resolve("");
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.stop();
    });
  }, []);

  const reset = useCallback(() => {
    chunksRef.current = [];
  }, []);

  return {
    isRecording,
    isTranscribing,
    start,
    stop,
    stopAndTranscribe,
    reset,
  };
}
