import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import * as api from "../api";
import { useInterview } from "../hooks/useInterview";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--text-h)", fontWeight: 500 }}>{label}</span>
        <span style={{ color: "var(--text-muted)" }}>{score}/100</span>
      </div>
      <div style={{ background: "var(--border)", borderRadius: 20, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, background: color, borderRadius: 20, height: 6, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

export default function InterviewPage({ userId }: { userId: number }) {
  const { t } = useTranslation();

  const [offers, setOffers] = useState<api.Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<number | null>(null);
  const [interviewType, setInterviewType] = useState("hr");
  const [difficulty, setDifficulty] = useState("junior");
  const [language, setLanguage] = useState("en");
  const [duration, setDuration] = useState(15);
  const [enableHints, setEnableHints] = useState(false);

  const [activeSession, setActiveSession] = useState<api.InterviewSession | null>(null);
  const [sessions, setSessions] = useState<api.InterviewSession[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<api.InterviewSessionDetail | null>(null);

  const [predictedQuestions, setPredictedQuestions] = useState<api.PredictedQuestion[]>([]);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<api.InterviewAnalysis | null>(null);

  const [progress, setProgress] = useState<api.InterviewProgress | null>(null);

  const [answerText, setAnswerText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [view, setView] = useState<"setup" | "live" | "history" | "detail">("setup");

  const interview = useInterview(activeSession?.session_id ?? null);
  const speech = useSpeechRecognition(language);

  useEffect(() => {
    api.getOffers(userId).then(setOffers).catch(() => {});
    api.getInterviewSessions(userId).then(setSessions).catch(() => {});
    api.getInterviewProgress(userId).then(setProgress).catch(() => {});
  }, [userId]);

  const handleCreateSession = async () => {
    setError(""); setLoading(true);
    try {
      const session = await api.createInterviewSession(userId, {
        offer_id: selectedOffer, interview_type: interviewType,
        difficulty, language, duration_minutes: duration, enable_hints: enableHints,
      });
      setActiveSession(session); setView("live"); setAnalysis(null);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t("interviewPage.createFailed")); }
    finally { setLoading(false); }
  };

  const handlePredictQuestions = async () => {
    if (!selectedOffer) return;
    setLoading(true);
    try {
      const qs = await api.predictQuestions(userId, selectedOffer, {
        interview_type: interviewType, difficulty, language, count: 10,
      });
      setPredictedQuestions(qs);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t("interviewPage.predictFailed")); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (view === "live" && activeSession && interview.state.status === "idle") {
      interview.connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeSession, interview.state.status]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.state.status, interview.state.questionNumber]);

  const handleSubmitAnswer = useCallback(async () => {
    interview.pauseTimer();
    if (speech.isRecording) {
      setIsSubmitting(true);
      const transcription = await speech.stopAndTranscribe();
      const finalText = answerText.trim() || transcription;
      interview.submitAnswer(finalText);
      setAnswerText(""); setIsSubmitting(false);
    } else {
      interview.submitAnswer(answerText);
      setAnswerText("");
    }
  }, [answerText, interview, speech]);

  const handleSkip = useCallback(() => {
    speech.stop(); interview.skipQuestion(); setAnswerText("");
  }, [interview, speech]);

  const handleEndInterview = useCallback(async () => {
    speech.stop(); interview.endInterview();
  }, [interview, speech]);

  useEffect(() => {
    if (interview.state.status === "results" && activeSession) {
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
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t("interviewPage.analysisFailed")); }
    finally { setAnalyzing(false); }
  };

  const handleViewDetail = async (sessionId: number) => {
    try {
      const detail = await api.getInterviewSessionDetail(userId, sessionId);
      setSelectedDetail(detail); setView("detail");
    } catch { setError(t("interviewPage.loadDetailFailed")); }
  };

  const handleDeleteSession = async (sessionId: number) => {
    try {
      await api.deleteInterviewSession(userId, sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch { setError(t("interviewPage.deleteFailed")); }
  };

  const handleBackToSetup = () => {
    setView("setup"); setActiveSession(null);
    setAnalysis(null); setSelectedDetail(null); setPredictedQuestions([]);
  };

  return (
    <div className="page interview-page">
      <div className="page-header">
        <h2>{t("interviewPage.title")}</h2>
        <p className="page-desc">{t("interviewPage.description")}</p>
      </div>

      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}

      {/* Sub-navigation */}
      {view !== "live" && (
        <div className="tab-bar" style={{ marginBottom: 20 }}>
          <button className={view === "setup" ? "active" : ""} onClick={() => { setView("setup"); setSelectedDetail(null); }}>
            {t("interviewPage.newInterview")}
          </button>
          <button className={view === "history" || view === "detail" ? "active" : ""} onClick={() => setView("history")}>
            {t("interviewPage.history")} ({sessions.length})
          </button>
        </div>
      )}

      {/* SETUP */}
      {view === "setup" && (
        <div>
          {progress && progress.total_sessions > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
              <div className="glass-card stat-card">
                <span className="stat-value">{progress.total_sessions}</span>
                <span className="stat-label">{t("interviewPage.sessions")}</span>
              </div>
              {progress.average_score != null && (
                <div className="glass-card stat-card">
                  <span className="stat-value">{progress.average_score}</span>
                  <span className="stat-label">{t("interviewPage.avgScore")}</span>
                </div>
              )}
              <div className="glass-card stat-card">
                <span className="stat-value">{progress.total_practice_minutes}</span>
                <span className="stat-label">{t("interviewPage.minPracticed")}</span>
              </div>
              <div className="glass-card stat-card">
                <span className="stat-value">{progress.sessions_this_week}</span>
                <span className="stat-label">{t("interviewPage.thisWeek")}</span>
              </div>
              {progress.best_category && (
                <div className="glass-card stat-card">
                  <span className="stat-value" style={{ fontSize: 16 }}>{progress.best_category}</span>
                  <span className="stat-label">{t("interviewPage.best")}</span>
                </div>
              )}
              {progress.worst_category && (
                <div className="glass-card stat-card">
                  <span className="stat-value" style={{ fontSize: 16 }}>{progress.worst_category}</span>
                  <span className="stat-label">{t("interviewPage.focusOn")}</span>
                </div>
              )}
            </div>
          )}

          <div className="glass-card" style={{ marginBottom: 20 }}>
            <div className="glass-card-header"><h3>{t("interviewPage.configureInterview")}</h3></div>
            <div className="glass-card-body">
              <div className="form-grid">
                <label>
                  {t("interviewPage.offer")}
                  <select value={selectedOffer ?? ""} onChange={(e) => setSelectedOffer(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">{t("interviewPage.generalNoOffer")}</option>
                    {offers.map((o) => <option key={o.id} value={o.id}>{o.company} — {o.title}</option>)}
                  </select>
                </label>
                <label>
                  {t("interviewPage.type")}
                  <select value={interviewType} onChange={(e) => setInterviewType(e.target.value)}>
                    <option value="hr">{t("interviewPage.hr")}</option>
                    <option value="technical">{t("interviewPage.technical")}</option>
                    <option value="behavioral">{t("interviewPage.behavioral")}</option>
                    <option value="pitch">{t("interviewPage.pitch")}</option>
                  </select>
                </label>
                <label>
                  {t("interviewPage.difficulty")}
                  <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                    <option value="junior">{t("interviewPage.junior")}</option>
                    <option value="intermediate">{t("interviewPage.intermediate")}</option>
                    <option value="advanced">{t("interviewPage.advanced")}</option>
                  </select>
                </label>
                <label>
                  {t("interviewPage.language")}
                  <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="en">{t("interviewPage.english")}</option>
                    <option value="fr">{t("interviewPage.french")}</option>
                  </select>
                </label>
                <label>
                  {t("interviewPage.duration")}
                  <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                    <option value={5}>5 min</option>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                    <option value={20}>20 min</option>
                    <option value={30}>30 min</option>
                  </select>
                </label>
                <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={enableHints} onChange={(e) => setEnableHints(e.target.checked)} style={{ width: "auto" }} />
                  {t("interviewPage.enableHints")}
                </label>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button onClick={handleCreateSession} disabled={loading} className="btn-primary">
                  {loading ? t("interviewPage.creating") : t("interviewPage.startInterview")}
                </button>
                {selectedOffer && (
                  <button onClick={handlePredictQuestions} disabled={loading} className="btn-secondary">
                    {t("interviewPage.predictQuestions")}
                  </button>
                )}
              </div>
            </div>
          </div>

          {predictedQuestions.length > 0 && (
            <div className="glass-card">
              <div className="glass-card-header"><h3>{t("interviewPage.predictedQuestions")}</h3></div>
              <div className="glass-card-body">
                {predictedQuestions.map((q, i) => (
                  <div key={i} style={{ marginBottom: 14, padding: 12, background: "var(--accent-light)", borderRadius: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-h)" }}>{i + 1}. {q.question}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "flex", gap: 6 }}>
                      <span className="badge">{q.category}</span>
                      <span className="badge">{q.difficulty}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text)", marginTop: 4 }}>{q.tip}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIVE INTERVIEW */}
      {view === "live" && activeSession && (
        <div>
          <div className="glass-card" style={{ marginBottom: 16, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ color: "var(--text-h)" }}>{activeSession.offer_title || t("interviewPage.general")}</strong>
              {activeSession.company && <span style={{ color: "var(--text-muted)" }}> at {activeSession.company}</span>}
              <span className="badge" style={{ marginLeft: 8 }}>{activeSession.interview_type}</span>
              <span className="badge" style={{ marginLeft: 4 }}>{activeSession.difficulty}</span>
            </div>
            <div style={{ fontSize: 22, fontFamily: "var(--mono)", color: "var(--text-h)" }}>
              {formatTime(interview.state.elapsedSeconds)} / {formatTime(activeSession.duration_minutes * 60)}
            </div>
          </div>

          {(interview.state.status === "idle" || interview.state.status === "connecting") && (
            <div className="glass-card" style={{ textAlign: "center", padding: 24 }}>
              <p style={{ color: "var(--text-muted)" }}>{t("interviewPage.connecting")}</p>
            </div>
          )}

          {(interview.state.status === "active" || interview.state.status === "thinking") && (
            <div>
              <div className="glass-card" style={{ background: "var(--info-light)", marginBottom: 12, padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{t("interviewPage.question", { number: interview.state.questionNumber })}</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-h)" }}>{interview.state.currentQuestion}</div>
              </div>

              {interview.state.hint && (
                <div className="glass-card" style={{ background: "var(--warning-light)", marginBottom: 12, padding: "12px 18px", fontSize: 13 }}>
                  {t("interviewPage.hintLabel")} {interview.state.hint}
                </div>
              )}

              {interview.state.status === "thinking" && (
                <div className="glass-card" style={{ textAlign: "center", padding: 16, color: "var(--text-muted)" }}>
                  {t("interviewPage.aiPreparing")}
                </div>
              )}

              {interview.state.status === "active" && (
                <div className="glass-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "0 2px" }}>
                    <label style={{ margin: 0, flexDirection: "row" }}>{t("interviewPage.yourAnswer")}</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {speech.isRecording && (
                        <span style={{ fontSize: 12, color: "var(--danger)", display: "flex", alignItems: "center", gap: 4 }}>
                          <span className="recording-dot" style={{ width: 8, height: 8 }} /> {t("interviewPage.recording")}
                        </span>
                      )}
                      {speech.isTranscribing && <span style={{ fontSize: 12, color: "var(--info)" }}>{t("interviewPage.transcribing")}</span>}
                      <button
                        onClick={() => speech.isRecording ? speech.stop() : speech.start()}
                        disabled={speech.isTranscribing}
                        className={speech.isRecording ? "btn-danger" : "btn-primary"}
                        style={{ padding: "4px 14px", fontSize: 12, borderRadius: 20, boxShadow: "none" }}
                      >
                        {speech.isRecording ? t("interviewPage.pauseMic") : t("interviewPage.startMic")}
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    placeholder={speech.isRecording ? t("interviewPage.speakNow") : t("interviewPage.typeOrMic")}
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    style={{ width: "100%", marginBottom: 8 }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleSubmitAnswer} disabled={(!answerText.trim() && !speech.isRecording) || isSubmitting || speech.isTranscribing} className="btn-primary" style={{ boxShadow: "none" }}>
                      {isSubmitting || speech.isTranscribing ? t("interviewPage.transcribing") : speech.isRecording ? t("interviewPage.stopSubmit") : t("interviewPage.submit")}
                    </button>
                    <button onClick={handleSkip} className="btn-secondary" disabled={isSubmitting}>{t("interviewPage.skip")}</button>
                    <button onClick={handleEndInterview} className="btn-danger" style={{ marginLeft: "auto" }} disabled={isSubmitting}>{t("interviewPage.end")}</button>
                    {enableHints && (
                      <button onClick={() => interview.requestHint(answerText)} className="btn-secondary">{t("interviewPage.hint")}</button>
                    )}
                  </div>
                </div>
              )}

              {interview.state.turns.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ textTransform: "none", letterSpacing: 0, color: "var(--text-h)", marginBottom: 8 }}>{t("interviewPage.previousAnswers")}</h4>
                  {interview.state.turns.map((turn, i) => (
                    <div key={i} className="glass-card" style={{ marginBottom: 8, padding: "12px 16px", fontSize: 13 }}>
                      <div style={{ color: "var(--accent)", fontWeight: 500 }}>Q{i + 1}: {turn.question}</div>
                      <div style={{ marginTop: 4, color: "var(--text)" }}>{turn.answer}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {interview.state.status === "error" && (
            <div className="glass-card" style={{ background: "var(--danger-light)", padding: 18 }}>
              <p>{t("interviewPage.error")} {interview.state.error}</p>
              <button onClick={handleBackToSetup} className="btn-secondary" style={{ marginTop: 8 }}>{t("interviewPage.backToSetup")}</button>
            </div>
          )}

          {interview.state.status === "results" && (
            <div>
              <div className="glass-card" style={{ background: "var(--success-light)", padding: 18 }}>
                <h3 style={{ marginBottom: 8 }}>{t("interviewPage.interviewComplete")}</h3>
                {interview.state.summary && (
                  <p style={{ fontSize: 13, color: "var(--text)" }}>
                    {t("interviewPage.questionsAnswered", { count: interview.state.summary.questions_answered, time: formatTime(interview.state.summary.duration_seconds) })}
                  </p>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={handleAnalyze} disabled={analyzing} className="btn-primary" style={{ boxShadow: "none" }}>
                    {analyzing ? t("interviewPage.analyzing") : t("interviewPage.getAIAnalysis")}
                  </button>
                  <button onClick={handleBackToSetup} className="btn-secondary">{t("interviewPage.newInterviewBtn")}</button>
                </div>
              </div>
              {analysis && <AnalysisView analysis={analysis} />}
            </div>
          )}
        </div>
      )}

      {/* HISTORY */}
      {view === "history" && (
        <div>
          {sessions.length === 0 ? (
            <p className="empty">{t("interviewPage.noSessions")}</p>
          ) : (
            <div className="card-list">
              {sessions.map((s) => (
                <div key={s.id} className="glass-card" style={{ padding: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ color: "var(--text-h)", fontSize: 14 }}>{s.company || t("interviewPage.general")}</strong>
                        <span className="badge">{s.interview_type}</span>
                        <span className="badge">{s.difficulty}</span>
                        <span className={`badge badge-${s.status}`}>{s.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}
                      </div>
                    </div>
                    <button onClick={() => handleViewDetail(s.id)} className="btn-ghost">{t("interviewPage.view")}</button>
                    <button onClick={() => handleDeleteSession(s.id)} className="btn-icon">x</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DETAIL */}
      {view === "detail" && selectedDetail && (
        <div>
          <button onClick={() => setView("history")} className="btn-secondary" style={{ marginBottom: 12 }}>&larr; {t("interviewPage.backToHistory")}</button>

          <div className="glass-card" style={{ marginBottom: 16 }}>
            <div className="glass-card-header">
              <h3 style={{ flex: 1, margin: 0 }}>
                {selectedDetail.offer_title || t("interviewPage.general")}
                {selectedDetail.company && ` — ${selectedDetail.company}`}
              </h3>
            </div>
            <div className="glass-card-body">
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" }}>
                <span>{t("interviewPage.typeLabel")} {selectedDetail.interview_type}</span>
                <span>{t("interviewPage.difficultyLabel")} {selectedDetail.difficulty}</span>
                <span>{t("interviewPage.languageLabel")} {selectedDetail.language}</span>
                <span>{t("interviewPage.durationLabel")} {selectedDetail.duration_minutes} min</span>
                <span>{t("interviewPage.statusLabel")} {selectedDetail.status}</span>
              </div>
            </div>
          </div>

          {selectedDetail.analysis ? (
            <AnalysisView analysis={selectedDetail.analysis} />
          ) : selectedDetail.turns.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ textTransform: "none", letterSpacing: 0, color: "var(--text-h)", marginBottom: 8 }}>{t("interviewPage.interviewTranscript")}</h4>
              {selectedDetail.turns.map((turn) => (
                <div key={turn.id} className="glass-card" style={{ marginBottom: 8, padding: "14px 18px" }}>
                  <div style={{ color: "var(--accent)", fontWeight: 500, fontSize: 13 }}>Q{turn.turn_number}: {turn.question_text}</div>
                  <div style={{ marginTop: 4, fontSize: 13 }}>
                    {turn.skipped ? <em>{t("interviewPage.skipped")}</em> : turn.answer_transcript || <em>{t("interviewPage.noAnswer")}</em>}
                  </div>
                  {turn.clarity_score != null && (
                    <div style={{ marginTop: 8, padding: 10, background: "var(--accent-light)", borderRadius: 8 }}>
                      <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--text-muted)" }}>
                        <span>{t("interviewPage.clarity")} {turn.clarity_score}/100</span>
                        <span>{t("interviewPage.relevance")} {turn.relevance_score}/100</span>
                        <span>{t("interviewPage.structure")} {turn.structure_score}/100</span>
                      </div>
                      {turn.feedback && <div style={{ marginTop: 4, fontSize: 12, color: "var(--text)" }}>{turn.feedback}</div>}
                      {turn.better_answer && (
                        <details style={{ marginTop: 4 }}>
                          <summary style={{ fontSize: 12, cursor: "pointer", color: "var(--accent)" }}>{t("interviewPage.betterAnswer")}</summary>
                          <div style={{ marginTop: 4, fontSize: 12 }}>{turn.better_answer}</div>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!selectedDetail.analysis && (selectedDetail.status === "completed" || selectedDetail.status === "analyzed") && (
            <div style={{ marginTop: 16 }}>
              <button
                onClick={async () => {
                  setAnalyzing(true);
                  try {
                    const result = await api.analyzeInterview(userId, selectedDetail.id);
                    setSelectedDetail({ ...selectedDetail, analysis: result, status: "analyzed" });
                    api.getInterviewSessions(userId).then(setSessions).catch(() => {});
                  } catch { setError(t("interviewPage.analysisFailed")); }
                  finally { setAnalyzing(false); }
                }}
                disabled={analyzing}
                className="btn-primary"
              >
                {analyzing ? t("interviewPage.analyzing") : t("interviewPage.runAIAnalysis")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AnalysisView({ analysis }: { analysis: api.InterviewAnalysis }) {
  const { t } = useTranslation();

  return (
    <div style={{ marginTop: 16 }}>
      <div className="glass-card" style={{ marginBottom: 16 }}>
        <div className="glass-card-header"><h3>{t("analysis.title")}</h3></div>
        <div className="glass-card-body">
          <div className="bento-grid-2">
            <div>
              <ScoreBar score={analysis.overall_score} label={t("analysis.overall")} />
              <ScoreBar score={analysis.communication_score} label={t("analysis.communication")} />
              <ScoreBar score={analysis.confidence_score} label={t("analysis.confidence")} />
              {analysis.technical_score != null && <ScoreBar score={analysis.technical_score} label={t("analysis.technical")} />}
              {analysis.behavioral_score != null && <ScoreBar score={analysis.behavioral_score} label={t("analysis.behavioral")} />}
            </div>
            <div>
              <p style={{ fontWeight: 500, fontSize: 13, color: "var(--text-h)" }}>{analysis.summary}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bento-grid-3" style={{ marginBottom: 16 }}>
        <div className="glass-card">
          <div className="glass-card-header"><h3 style={{ color: "var(--success)" }}>{t("analysis.strengths")}</h3></div>
          <div className="glass-card-body">
            <ul style={{ paddingLeft: 18, fontSize: 13 }}>{analysis.strengths.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}</ul>
          </div>
        </div>
        <div className="glass-card">
          <div className="glass-card-header"><h3 style={{ color: "var(--danger)" }}>{t("analysis.weaknesses")}</h3></div>
          <div className="glass-card-body">
            <ul style={{ paddingLeft: 18, fontSize: 13 }}>{analysis.weaknesses.map((w, i) => <li key={i} style={{ marginBottom: 4 }}>{w}</li>)}</ul>
          </div>
        </div>
        <div className="glass-card">
          <div className="glass-card-header"><h3 style={{ color: "var(--info)" }}>{t("analysis.improvements")}</h3></div>
          <div className="glass-card-body">
            <ul style={{ paddingLeft: 18, fontSize: 13 }}>{analysis.improvements.map((imp, i) => <li key={i} style={{ marginBottom: 4 }}>{imp}</li>)}</ul>
          </div>
        </div>
      </div>

      {analysis.filler_words_analysis && (
        <div className="glass-card" style={{ marginBottom: 12 }}>
          <div className="glass-card-header"><h3>{t("analysis.fillerWords")}</h3></div>
          <div className="glass-card-body"><p style={{ fontSize: 13 }}>{analysis.filler_words_analysis}</p></div>
        </div>
      )}

      {analysis.star_method_usage && (
        <div className="glass-card" style={{ marginBottom: 12 }}>
          <div className="glass-card-header"><h3>{t("analysis.starMethod")}</h3></div>
          <div className="glass-card-body"><p style={{ fontSize: 13 }}>{analysis.star_method_usage}</p></div>
        </div>
      )}

      {analysis.per_turn_feedback.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <h4 style={{ textTransform: "none", letterSpacing: 0, color: "var(--text-h)", marginBottom: 8 }}>{t("analysis.perQuestion")}</h4>
          {analysis.per_turn_feedback.map((turn) => (
            <div key={turn.id} className="glass-card" style={{ marginBottom: 8, padding: "14px 18px" }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: "var(--text-h)" }}>Q{turn.turn_number}: {turn.question_text}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: "var(--text)" }}>
                {turn.skipped ? <em>{t("interviewPage.skipped")}</em> : turn.answer_transcript}
              </div>
              {turn.clarity_score != null && (
                <div style={{ marginTop: 6, display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
                  <span>{t("interviewPage.clarity")} {turn.clarity_score}</span>
                  <span>{t("interviewPage.relevance")} {turn.relevance_score}</span>
                  <span>{t("interviewPage.structure")} {turn.structure_score}</span>
                </div>
              )}
              {turn.feedback && <div style={{ marginTop: 4, fontSize: 12, color: "var(--text)" }}>{turn.feedback}</div>}
              {turn.better_answer && (
                <details style={{ marginTop: 4 }}>
                  <summary style={{ fontSize: 12, cursor: "pointer", color: "var(--accent)" }}>{t("interviewPage.betterAnswer")}</summary>
                  <div style={{ marginTop: 4, fontSize: 12 }}>{turn.better_answer}</div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
