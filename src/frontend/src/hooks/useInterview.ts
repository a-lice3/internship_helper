import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InterviewState {
  status: "idle" | "connecting" | "active" | "thinking" | "results" | "error";
  currentQuestion: string;
  questionNumber: number;
  liveTranscript: string;
  turns: Array<{ question: string; answer: string }>;
  elapsedSeconds: number;
  remainingSeconds: number;
  totalQuestions: number;
  hint: string | null;
  error: string | null;
  summary: { questions_answered: number; duration_seconds: number } | null;
}

type ServerMessage = {
  type: string;
  data?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useInterview(sessionId: string | null) {
  const [state, setState] = useState<InterviewState>({
    status: "idle",
    currentQuestion: "",
    questionNumber: 0,
    liveTranscript: "",
    turns: [],
    elapsedSeconds: 0,
    remainingSeconds: 0,
    totalQuestions: 0,
    hint: null,
    error: null,
    summary: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingStartRef = useRef<number>(0);
  const currentTranscriptRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Connect WebSocket
  const connect = useCallback(() => {
    if (!sessionId) return;

    setState((s) => ({ ...s, status: "connecting", error: null }));

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(
      `${protocol}://${window.location.hostname}:8000/ws/interview/${sessionId}`
    );

    ws.onopen = () => {
      wsRef.current = ws;
    };

    ws.onmessage = (event) => {
      const msg: ServerMessage = JSON.parse(event.data);
      handleMessage(msg);
    };

    ws.onerror = () => {
      setState((s) => ({
        ...s,
        status: "error",
        error: "WebSocket connection failed",
      }));
    };

    ws.onclose = () => {
      wsRef.current = null;
      stopRecording();
    };

    return () => {
      ws.close();
    };
  }, [sessionId]);

  // Handle server messages
  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "session.ready":
        setState((s) => ({
          ...s,
          status: "active",
          remainingSeconds:
            ((msg.data?.duration_minutes as number) || 15) * 60,
        }));
        break;

      case "ai.question":
        setState((s) => ({
          ...s,
          status: "active",
          currentQuestion: (msg.data?.text as string) || "",
          questionNumber: (msg.data?.question_number as number) || s.questionNumber + 1,
          liveTranscript: "",
          hint: null,
        }));
        currentTranscriptRef.current = "";
        break;

      case "ai.thinking":
        setState((s) => ({ ...s, status: "thinking" }));
        break;

      case "timer":
        setState((s) => ({
          ...s,
          elapsedSeconds: (msg.data?.elapsed_seconds as number) || 0,
          remainingSeconds: (msg.data?.remaining_seconds as number) || 0,
        }));
        break;

      case "hint":
        setState((s) => ({
          ...s,
          hint: (msg.data?.text as string) || null,
        }));
        break;

      case "interview.summary":
        stopRecording();
        setState((s) => ({
          ...s,
          status: "results",
          summary: {
            questions_answered:
              (msg.data?.questions_answered as number) || s.questionNumber,
            duration_seconds:
              (msg.data?.duration_seconds as number) || s.elapsedSeconds,
          },
        }));
        break;

      case "session.closed":
        stopRecording();
        setState((s) => ({
          ...s,
          status: s.status === "results" ? "results" : "idle",
        }));
        break;

      case "error":
        setState((s) => ({
          ...s,
          status: "error",
          error: (msg.data?.message as string) || "Unknown error",
        }));
        break;
    }
  }, []);

  // Start mic recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        // Keep chunks for potential use
      };

      recorder.start(500); // Collect data every 500ms
      recordingStartRef.current = Date.now();
    } catch (err) {
      setState((s) => ({
        ...s,
        error: "Microphone access denied",
      }));
    }
  }, []);

  // Stop mic recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  // Send turn.end with the transcript typed by user
  const submitAnswer = useCallback(
    (transcript: string) => {
      if (!wsRef.current) return;
      const duration = recordingStartRef.current
        ? Math.round((Date.now() - recordingStartRef.current) / 1000)
        : undefined;

      // Save turn locally
      setState((s) => ({
        ...s,
        turns: [
          ...s.turns,
          { question: s.currentQuestion, answer: transcript },
        ],
      }));

      wsRef.current.send(
        JSON.stringify({
          type: "turn.end",
          data: { transcript, duration_seconds: duration },
        })
      );

      stopRecording();
    },
    [stopRecording]
  );

  // Skip question
  const skipQuestion = useCallback(() => {
    if (!wsRef.current) return;
    setState((s) => ({
      ...s,
      turns: [
        ...s.turns,
        { question: s.currentQuestion, answer: "(skipped)" },
      ],
    }));
    wsRef.current.send(JSON.stringify({ type: "question.skip" }));
    stopRecording();
  }, [stopRecording]);

  // End interview
  const endInterview = useCallback(() => {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "interview.end" }));
    stopRecording();
  }, [stopRecording]);

  // Request hint
  const requestHint = useCallback(
    (partialTranscript: string) => {
      if (!wsRef.current) return;
      wsRef.current.send(
        JSON.stringify({
          type: "hint.request",
          data: { partial_transcript: partialTranscript },
        })
      );
    },
    []
  );

  // Timer
  useEffect(() => {
    if (state.status === "active") {
      timerRef.current = setInterval(() => {
        setState((s) => ({
          ...s,
          elapsedSeconds: s.elapsedSeconds + 1,
          remainingSeconds: Math.max(0, s.remainingSeconds - 1),
        }));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.status]);

  // Reset state when sessionId changes
  useEffect(() => {
    setState({
      status: "idle",
      currentQuestion: "",
      questionNumber: 0,
      liveTranscript: "",
      turns: [],
      elapsedSeconds: 0,
      remainingSeconds: 0,
      totalQuestions: 0,
      hint: null,
      error: null,
      summary: null,
    });
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      stopRecording();
    };
  }, [stopRecording]);

  return {
    state,
    connect,
    startRecording,
    stopRecording,
    submitAnswer,
    skipQuestion,
    endInterview,
    requestHint,
  };
}
