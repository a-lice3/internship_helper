import { useEffect, useState, useCallback } from "react";
import * as api from "../api";
import { useInterview } from "../hooks/useInterview";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? "#4caf50" : score >= 50 ? "#ff9800" : "#f44336";
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span>{label}</span>
        <span>{score}/100</span>
      </div>
      <div style={{ background: "#e0e0e0", borderRadius: 4, height: 8 }}>
        <div style={{ width: `${score}%`, background: color, borderRadius: 4, height: 8 }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function InterviewPage({ userId }: { userId: number }) {
  // Setup state
  const [offers, setOffers] = useState<api.Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<number | null>(null);
  const [interviewType, setInterviewType] = useState("hr");
  const [difficulty, setDifficulty] = useState("junior");
  const [language, setLanguage] = useState("en");
  const [duration, setDuration] = useState(15);
  const [enableHints, setEnableHints] = useState(false);

  // Session state
  const [activeSession, setActiveSession] = useState<api.InterviewSession | null>(null);
  const [sessions, setSessions] = useState<api.InterviewSession[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<api.InterviewSessionDetail | null>(null);

  // Question prediction
  const [predictedQuestions, setPredictedQuestions] = useState<api.PredictedQuestion[]>([]);

  // Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<api.InterviewAnalysis | null>(null);

  // Progress
  const [progress, setProgress] = useState<api.InterviewProgress | null>(null);

  // User answer text (typed or speech-to-text)
  const [answerText, setAnswerText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Loading / errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // View
  const [view, setView] = useState<"setup" | "live" | "history" | "detail">("setup");

  // WebSocket hook
  const interview = useInterview(activeSession?.session_id ?? null);

  // Speech recognition
  const speech = useSpeechRecognition(language);

  // Load offers & sessions on mount
  useEffect(() => {
    api.getOffers(userId).then(setOffers).catch(() => {});
    api.getInterviewSessions(userId).then(setSessions).catch(() => {});
    api.getInterviewProgress(userId).then(setProgress).catch(() => {});
  }, [userId]);

  // ---------- Setup actions ----------

  const handleCreateSession = async () => {
    setError("");
    setLoading(true);
    try {
      const session = await api.createInterviewSession(userId, {
        offer_id: selectedOffer,
        interview_type: interviewType,
        difficulty,
        language,
        duration_minutes: duration,
        enable_hints: enableHints,
      });
      setActiveSession(session);
      setView("live");
      setAnalysis(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  const handlePredictQuestions = async () => {
    if (!selectedOffer) return;
    setLoading(true);
    try {
      const qs = await api.predictQuestions(userId, selectedOffer, {
        interview_type: interviewType,
        difficulty,
        language,
        count: 10,
      });
      setPredictedQuestions(qs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to predict questions");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Live interview actions ----------

  // Start the WS connection when entering live view
  useEffect(() => {
    if (view === "live" && activeSession && interview.state.status === "idle") {
      interview.connect();
    }
  }, [view, activeSession, interview.state.status]);

  // Auto-start mic recording when a question arrives
  useEffect(() => {
    if (interview.state.status === "active" && interview.state.questionNumber > 0) {
      interview.startRecording();
      speech.reset();
      speech.start();
      setAnswerText("");
    }
    if (interview.state.status === "thinking" || interview.state.status === "results") {
      speech.stop();
    }
  }, [interview.state.status, interview.state.questionNumber]);

  const handleSubmitAnswer = useCallback(async () => {
    if (speech.isRecording) {
      // Stop recording, transcribe via Voxtral, then submit
      setIsSubmitting(true);
      const transcription = await speech.stopAndTranscribe();
      const finalText = answerText.trim() || transcription;
      interview.submitAnswer(finalText);
      setAnswerText("");
      setIsSubmitting(false);
    } else {
      interview.submitAnswer(answerText);
      setAnswerText("");
    }
  }, [answerText, interview, speech]);

  const handleSkip = useCallback(() => {
    speech.stop();
    interview.skipQuestion();
    setAnswerText("");
  }, [interview, speech]);

  const handleEndInterview = useCallback(async () => {
    speech.stop();
    interview.endInterview();
  }, [interview, speech]);

  // When interview ends, go to analysis
  useEffect(() => {
    if (interview.state.status === "results" && activeSession) {
      // Refresh sessions list
      api.getInterviewSessions(userId).then(setSessions).catch(() => {});
    }
  }, [interview.state.status, activeSession, userId]);

  const handleAnalyze = async () => {
    if (!activeSession) return;
    setAnalyzing(true);
    try {
      const result = await api.analyzeInterview(userId, activeSession.id);
      setAnalysis(result);
      api.getInterviewSessions(userId).then(setSessions).catch(() => {});
      api.getInterviewProgress(userId).then(setProgress).catch(() => {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  // ---------- History actions ----------

  const handleViewDetail = async (sessionId: number) => {
    try {
      const detail = await api.getInterviewSessionDetail(userId, sessionId);
      setSelectedDetail(detail);
      setView("detail");
    } catch {
      setError("Failed to load session details");
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    try {
      await api.deleteInterviewSession(userId, sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      setError("Failed to delete session");
    }
  };

  const handleBackToSetup = () => {
    setView("setup");
    setActiveSession(null);
    setAnalysis(null);
    setSelectedDetail(null);
    setPredictedQuestions([]);
  };

  // ---------- Render ----------

  return (
    <div className="page interview-page">
      <h2>Interview Simulation</h2>
      {error && <p className="error">{error}</p>}

      {/* Sub-navigation */}
      {view !== "live" && (
        <div className="tab-bar" style={{ marginBottom: 16 }}>
          <button className={view === "setup" ? "active" : ""} onClick={() => { setView("setup"); setSelectedDetail(null); }}>
            New Interview
          </button>
          <button className={view === "history" || view === "detail" ? "active" : ""} onClick={() => setView("history")}>
            History ({sessions.length})
          </button>
        </div>
      )}

      {/* ======================== SETUP ======================== */}
      {view === "setup" && (
        <div>
          {/* Progress summary */}
          {progress && progress.total_sessions > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3>Your Progress</h3>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div><strong>{progress.total_sessions}</strong> sessions</div>
                {progress.average_score != null && <div>Avg score: <strong>{progress.average_score}</strong>/100</div>}
                <div><strong>{progress.total_practice_minutes}</strong> min practiced</div>
                <div><strong>{progress.sessions_this_week}</strong> this week</div>
                {progress.best_category && <div>Best: <strong>{progress.best_category}</strong></div>}
                {progress.worst_category && <div>Focus on: <strong>{progress.worst_category}</strong></div>}
              </div>
              {progress.score_trend.length > 1 && (
                <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
                  Trend: {progress.score_trend.join(" → ")}
                </div>
              )}
            </div>
          )}

          <div className="card">
            <h3>Configure Interview</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                Offer (optional)
                <select value={selectedOffer ?? ""} onChange={(e) => setSelectedOffer(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">General (no offer)</option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>{o.company} — {o.title}</option>
                  ))}
                </select>
              </label>

              <label>
                Type
                <select value={interviewType} onChange={(e) => setInterviewType(e.target.value)}>
                  <option value="hr">HR</option>
                  <option value="technical">Technical</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="pitch">Pitch (1-2 min)</option>
                </select>
              </label>

              <label>
                Difficulty
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option value="junior">Junior / Intern</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>

              <label>
                Language
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="en">English</option>
                  <option value="fr">French</option>
                </select>
              </label>

              <label>
                Duration
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  <option value={5}>5 min</option>
                  <option value={10}>10 min</option>
                  <option value={15}>15 min</option>
                  <option value={20}>20 min</option>
                  <option value={30}>30 min</option>
                </select>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={enableHints} onChange={(e) => setEnableHints(e.target.checked)} />
                Enable real-time hints
              </label>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button onClick={handleCreateSession} disabled={loading}>
                {loading ? "Creating..." : "Start Interview"}
              </button>
              {selectedOffer && (
                <button onClick={handlePredictQuestions} disabled={loading} className="btn-secondary">
                  Predict Questions
                </button>
              )}
            </div>
          </div>

          {/* Predicted questions */}
          {predictedQuestions.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3>Predicted Questions</h3>
              {predictedQuestions.map((q, i) => (
                <div key={i} style={{ marginBottom: 12, padding: 8, background: "#f9f9f9", borderRadius: 4 }}>
                  <div style={{ fontWeight: 600 }}>{i + 1}. {q.question}</div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                    <span className="badge">{q.category}</span>
                    <span className="badge" style={{ marginLeft: 4 }}>{q.difficulty}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#444", marginTop: 4 }}>{q.tip}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================== LIVE INTERVIEW ======================== */}
      {view === "live" && activeSession && (
        <div>
          {/* Status bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <strong>{activeSession.offer_title || "General Interview"}</strong>
              {activeSession.company && ` at ${activeSession.company}`}
              <span className="badge" style={{ marginLeft: 8 }}>{activeSession.interview_type}</span>
              <span className="badge" style={{ marginLeft: 4 }}>{activeSession.difficulty}</span>
            </div>
            <div style={{ fontSize: 20, fontFamily: "monospace" }}>
              {formatTime(interview.state.elapsedSeconds)} / {formatTime(activeSession.duration_minutes * 60)}
            </div>
          </div>

          {/* Loading / connecting */}
          {(interview.state.status === "idle" || interview.state.status === "connecting") && (
            <div className="card">
              <p>Connecting to interview session...</p>
            </div>
          )}

          {/* Active interview */}
          {(interview.state.status === "active" || interview.state.status === "thinking") && (
            <div>
              {/* AI question */}
              <div className="card" style={{ background: "#e3f2fd", marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                  Question {interview.state.questionNumber}
                </div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  {interview.state.currentQuestion}
                </div>
              </div>

              {/* Hint */}
              {interview.state.hint && (
                <div className="card" style={{ background: "#fff3e0", marginBottom: 12, fontSize: 14 }}>
                  Hint: {interview.state.hint}
                </div>
              )}

              {/* AI thinking indicator */}
              {interview.state.status === "thinking" && (
                <div className="card" style={{ textAlign: "center", color: "#666" }}>
                  AI is preparing the next question...
                </div>
              )}

              {/* Answer area */}
              {interview.state.status === "active" && (
                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label style={{ margin: 0 }}>Your answer:</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {speech.isRecording && (
                        <span style={{ fontSize: 12, color: "#f44336", display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#f44336",
                            animation: "pulse 1s infinite",
                          }} />
                          Recording...
                        </span>
                      )}
                      {speech.isTranscribing && (
                        <span style={{ fontSize: 12, color: "#2196f3" }}>
                          Transcribing with Voxtral...
                        </span>
                      )}
                      <button
                        onClick={() => speech.isRecording ? speech.stop() : speech.start()}
                        disabled={speech.isTranscribing}
                        style={{
                          background: speech.isRecording ? "#f44336" : "#4caf50",
                          color: "white",
                          border: "none",
                          borderRadius: 20,
                          padding: "4px 14px",
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        {speech.isRecording ? "Pause Mic" : "Start Mic"}
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    placeholder={speech.isRecording
                      ? "Speak now... click 'Submit' when done and Voxtral will transcribe your answer"
                      : "Type your answer or start the mic to speak..."}
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    style={{ width: "100%", marginBottom: 8 }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={(!answerText.trim() && !speech.isRecording) || isSubmitting || speech.isTranscribing}
                    >
                      {isSubmitting || speech.isTranscribing
                        ? "Transcribing..."
                        : speech.isRecording
                          ? "Stop & Submit (Voxtral)"
                          : "Submit Answer"}
                    </button>
                    <button onClick={handleSkip} className="btn-secondary" disabled={isSubmitting}>
                      Skip Question
                    </button>
                    <button onClick={handleEndInterview} className="btn-danger" style={{ marginLeft: "auto" }} disabled={isSubmitting}>
                      End Interview
                    </button>
                    {enableHints && (
                      <button onClick={() => interview.requestHint(answerText)} className="btn-secondary">
                        Get Hint
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Previous turns */}
              {interview.state.turns.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4>Previous answers</h4>
                  {interview.state.turns.map((t, i) => (
                    <div key={i} className="card" style={{ marginBottom: 8, fontSize: 13 }}>
                      <div style={{ color: "#1565c0", fontWeight: 500 }}>Q{i + 1}: {t.question}</div>
                      <div style={{ marginTop: 4 }}>{t.answer}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {interview.state.status === "error" && (
            <div className="card" style={{ background: "#ffebee" }}>
              <p>Error: {interview.state.error}</p>
              <button onClick={handleBackToSetup}>Back to Setup</button>
            </div>
          )}

          {/* Results */}
          {interview.state.status === "results" && (
            <div>
              <div className="card" style={{ background: "#e8f5e9" }}>
                <h3>Interview Complete!</h3>
                {interview.state.summary && (
                  <p>
                    {interview.state.summary.questions_answered} questions answered in{" "}
                    {formatTime(interview.state.summary.duration_seconds)}.
                  </p>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={handleAnalyze} disabled={analyzing}>
                    {analyzing ? "Analyzing..." : "Get AI Analysis"}
                  </button>
                  <button onClick={handleBackToSetup} className="btn-secondary">
                    New Interview
                  </button>
                </div>
              </div>

              {/* Analysis results */}
              {analysis && <AnalysisView analysis={analysis} />}
            </div>
          )}
        </div>
      )}

      {/* ======================== HISTORY ======================== */}
      {view === "history" && (
        <div>
          {sessions.length === 0 ? (
            <p style={{ color: "#666" }}>No interview sessions yet. Start your first one!</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Company</th>
                  <th>Type</th>
                  <th>Difficulty</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}</td>
                    <td>{s.company || "General"}</td>
                    <td><span className="badge">{s.interview_type}</span></td>
                    <td>{s.difficulty}</td>
                    <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                    <td>—</td>
                    <td>
                      <button onClick={() => handleViewDetail(s.id)} className="btn-small">View</button>
                      <button onClick={() => handleDeleteSession(s.id)} className="btn-small btn-danger" style={{ marginLeft: 4 }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ======================== DETAIL VIEW ======================== */}
      {view === "detail" && selectedDetail && (
        <div>
          <button onClick={() => setView("history")} className="btn-secondary" style={{ marginBottom: 12 }}>
            Back to History
          </button>

          <div className="card">
            <h3>
              {selectedDetail.offer_title || "General Interview"}
              {selectedDetail.company && ` — ${selectedDetail.company}`}
            </h3>
            <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#666" }}>
              <span>Type: {selectedDetail.interview_type}</span>
              <span>Difficulty: {selectedDetail.difficulty}</span>
              <span>Language: {selectedDetail.language}</span>
              <span>Duration: {selectedDetail.duration_minutes} min</span>
              <span>Status: {selectedDetail.status}</span>
            </div>
          </div>

          {/* Turns */}
          {selectedDetail.turns.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4>Interview Transcript</h4>
              {selectedDetail.turns.map((t) => (
                <div key={t.id} className="card" style={{ marginBottom: 8 }}>
                  <div style={{ color: "#1565c0", fontWeight: 500 }}>
                    Q{t.turn_number}: {t.question_text}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    {t.skipped ? <em>(Skipped)</em> : t.answer_transcript || <em>(No answer)</em>}
                  </div>
                  {t.clarity_score != null && (
                    <div style={{ marginTop: 8, padding: 8, background: "#f5f5f5", borderRadius: 4 }}>
                      <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                        <span>Clarity: {t.clarity_score}/100</span>
                        <span>Relevance: {t.relevance_score}/100</span>
                        <span>Structure: {t.structure_score}/100</span>
                      </div>
                      {t.feedback && <div style={{ marginTop: 4, fontSize: 13 }}>{t.feedback}</div>}
                      {t.better_answer && (
                        <details style={{ marginTop: 4 }}>
                          <summary style={{ fontSize: 13, cursor: "pointer", color: "#1565c0" }}>Better answer example</summary>
                          <div style={{ marginTop: 4, fontSize: 13, color: "#333" }}>{t.better_answer}</div>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Analysis */}
          {selectedDetail.analysis && (
            <AnalysisView analysis={selectedDetail.analysis} />
          )}

          {/* Trigger analysis if not done yet */}
          {!selectedDetail.analysis && (selectedDetail.status === "completed" || selectedDetail.status === "analyzed") && (
            <div style={{ marginTop: 16 }}>
              <button
                onClick={async () => {
                  setAnalyzing(true);
                  try {
                    const result = await api.analyzeInterview(userId, selectedDetail.id);
                    setSelectedDetail({ ...selectedDetail, analysis: result, status: "analyzed" });
                    api.getInterviewSessions(userId).then(setSessions).catch(() => {});
                  } catch {
                    setError("Analysis failed");
                  } finally {
                    setAnalyzing(false);
                  }
                }}
                disabled={analyzing}
              >
                {analyzing ? "Analyzing..." : "Run AI Analysis"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analysis sub-component
// ---------------------------------------------------------------------------

function AnalysisView({ analysis }: { analysis: api.InterviewAnalysis }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div className="card">
        <h3>Analysis Results</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <ScoreBar score={analysis.overall_score} label="Overall" />
            <ScoreBar score={analysis.communication_score} label="Communication" />
            <ScoreBar score={analysis.confidence_score} label="Confidence" />
            {analysis.technical_score != null && (
              <ScoreBar score={analysis.technical_score} label="Technical" />
            )}
            {analysis.behavioral_score != null && (
              <ScoreBar score={analysis.behavioral_score} label="Behavioral" />
            )}
          </div>
          <div>
            <p style={{ fontWeight: 500 }}>{analysis.summary}</p>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
        <div className="card">
          <h4 style={{ color: "#4caf50" }}>Strengths</h4>
          <ul>
            {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
        <div className="card">
          <h4 style={{ color: "#f44336" }}>Weaknesses</h4>
          <ul>
            {analysis.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
        <div className="card">
          <h4 style={{ color: "#2196f3" }}>Improvements</h4>
          <ul>
            {analysis.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
          </ul>
        </div>
      </div>

      {analysis.filler_words_analysis && (
        <div className="card" style={{ marginTop: 12 }}>
          <h4>Filler Words</h4>
          <p>{analysis.filler_words_analysis}</p>
        </div>
      )}

      {analysis.star_method_usage && (
        <div className="card" style={{ marginTop: 12 }}>
          <h4>STAR Method Usage</h4>
          <p>{analysis.star_method_usage}</p>
        </div>
      )}

      {/* Per-turn feedback */}
      {analysis.per_turn_feedback.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <h4>Per-Question Breakdown</h4>
          {analysis.per_turn_feedback.map((t) => (
            <div key={t.id} className="card" style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 500 }}>Q{t.turn_number}: {t.question_text}</div>
              <div style={{ marginTop: 4, fontSize: 13 }}>
                {t.skipped ? <em>(Skipped)</em> : t.answer_transcript}
              </div>
              {t.clarity_score != null && (
                <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 12 }}>
                  <span>Clarity: {t.clarity_score}</span>
                  <span>Relevance: {t.relevance_score}</span>
                  <span>Structure: {t.structure_score}</span>
                </div>
              )}
              {t.feedback && <div style={{ marginTop: 4, fontSize: 13, color: "#555" }}>{t.feedback}</div>}
              {t.better_answer && (
                <details style={{ marginTop: 4 }}>
                  <summary style={{ fontSize: 13, cursor: "pointer", color: "#1565c0" }}>Better answer</summary>
                  <div style={{ marginTop: 4, fontSize: 13 }}>{t.better_answer}</div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
