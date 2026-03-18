import { useEffect, useState, useCallback, useRef } from "react";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import * as api from "../api";

type Tab = "generate" | "cover-letters" | "skill-gaps" | "pitch-analyses";

export default function AIPage({ userId }: { userId: number }) {
  const [tab, setTab] = useState<Tab>("generate");

  const [offers, setOffers] = useState<api.Offer[]>([]);
  const [templates, setTemplates] = useState<api.Template[]>([]);
  const [cvs, setCvs] = useState<api.CV[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<number | "">("");
  const [selectedTemplate, setSelectedTemplate] = useState<number | "">("");
  const [selectedCV, setSelectedCV] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [coverLetter, setCoverLetter] = useState<api.CoverLetterResult | null>(null);
  const [skillGap, setSkillGap] = useState<api.SkillGapResult | null>(null);

  const [latexResult, setLatexResult] = useState<api.AdaptCVLatexResult | null>(null);
  const [editedLatex, setEditedLatex] = useState("");
  const [savingLatex, setSavingLatex] = useState(false);

  const [pitchFile, setPitchFile] = useState<File | null>(null);
  const [pitchMode, setPitchMode] = useState<"upload" | "record">("upload");
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pitchResult, setPitchResult] = useState<api.PitchAnalysisResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [storedLetters, setStoredLetters] = useState<api.StoredCoverLetter[]>([]);
  const [storedGaps, setStoredGaps] = useState<api.StoredSkillGap[]>([]);
  const [storedPitches, setStoredPitches] = useState<api.StoredPitchAnalysis[]>([]);

  useEffect(() => {
    api.getOffers(userId).then(setOffers);
    api.getTemplates(userId).then(setTemplates);
    api.getCVs(userId).then(setCvs);
    api.getStoredCoverLetters(userId).then(setStoredLetters);
    api.getStoredSkillGaps(userId).then(setStoredGaps);
    api.getStoredPitchAnalyses(userId).then(setStoredPitches);
  }, [userId]);

  const handleSkillGap = async () => {
    if (!selectedOffer) return;
    setLoading(true); setError(""); setSkillGap(null);
    try {
      const result = await api.analyzeSkillGap(userId, Number(selectedOffer));
      setSkillGap(result);
      api.getStoredSkillGaps(userId).then(setStoredGaps);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Unknown error"); }
    setLoading(false);
  };

  const handleCoverLetter = async () => {
    if (!selectedOffer) return;
    setLoading(true); setError(""); setCoverLetter(null);
    try {
      const result = await api.generateCoverLetter(userId, Number(selectedOffer), selectedTemplate ? Number(selectedTemplate) : undefined);
      setCoverLetter(result);
      api.getStoredCoverLetters(userId).then(setStoredLetters);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Unknown error"); }
    setLoading(false);
  };

  const handleAdaptLatex = async () => {
    if (!selectedOffer || !selectedCV) return;
    setLoading(true); setError(""); setLatexResult(null);
    try {
      const result = await api.adaptCVLatex(userId, Number(selectedOffer), Number(selectedCV));
      setLatexResult(result);
      setEditedLatex(result.adapted_latex);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Unknown error"); }
    setLoading(false);
  };

  const handlePitchAnalysis = async () => {
    if (!pitchFile) return;
    setLoading(true); setError(""); setPitchResult(null);
    try {
      let result: api.PitchAnalysisResult;
      if (selectedOffer) {
        result = await api.analyzePitchForOffer(userId, Number(selectedOffer), pitchFile);
      } else {
        result = await api.analyzePitchGeneral(userId, pitchFile);
      }
      setPitchResult(result);
      api.getStoredPitchAnalyses(userId).then(setStoredPitches);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Unknown error"); }
    setLoading(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "pitch-recording.webm", { type: "audio/webm" });
        setPitchFile(file);
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingTime(0);
      };
      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      setError("Microphone access denied or unavailable");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const downloadDocx = async (text: string, company: string) => {
    const paragraphs = text.split("\n").map(
      (line) => new Paragraph({ children: [new TextRun({ text: line, size: 24 })], spacing: { after: 120 } }),
    );
    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Cover_Letter_${company.replace(/\s+/g, "_")}.docx`);
  };

  const handleSaveLatex = async () => {
    if (!latexResult || !selectedOffer) return;
    setSavingLatex(true); setError("");
    try {
      const offer = offers.find((o) => o.id === Number(selectedOffer));
      const saved = await api.saveCVWithLatex(userId, {
        name: `CV adapted - ${offer?.company ?? ""}`,
        content: "(LaTeX CV — see latex_content)",
        latex_content: editedLatex,
        support_files_dir: latexResult.support_files_dir,
        company: offer?.company,
        job_title: offer?.title,
        offer_id: Number(selectedOffer),
      });
      const blob = await api.compileCVPdf(userId, saved.id);
      saveAs(blob, `CV_${offer?.company?.replace(/\s+/g, "_") ?? "adapted"}.pdf`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Save/compile failed"); }
    setSavingLatex(false);
  };

  const handleDownloadPdfOnly = async () => {
    if (!latexResult || !selectedOffer) return;
    setSavingLatex(true); setError("");
    try {
      const offer = offers.find((o) => o.id === Number(selectedOffer));
      const saved = await api.saveCVWithLatex(userId, {
        name: `CV adapted - ${offer?.company ?? ""}`,
        content: "(LaTeX CV — see latex_content)",
        latex_content: editedLatex,
        support_files_dir: latexResult.support_files_dir,
        company: offer?.company,
        job_title: offer?.title,
        offer_id: Number(selectedOffer),
      });
      const blob = await api.compileCVPdf(userId, saved.id);
      saveAs(blob, `CV_${offer?.company?.replace(/\s+/g, "_") ?? "adapted"}.pdf`);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Compile failed"); }
    setSavingLatex(false);
  };

  const handleDeleteLetter = async (id: number) => {
    await api.deleteStoredCoverLetter(userId, id);
    setStoredLetters(storedLetters.filter((l) => l.id !== id));
  };

  const handleDeleteGap = async (id: number) => {
    await api.deleteStoredSkillGap(userId, id);
    setStoredGaps(storedGaps.filter((g) => g.id !== id));
  };

  const handleDeletePitch = async (id: number) => {
    await api.deleteStoredPitchAnalysis(userId, id);
    setStoredPitches(storedPitches.filter((p) => p.id !== id));
  };

  const latexCvs = cvs.filter((c) => c.latex_content);

  return (
    <div className="page">
      <div className="page-header">
        <h2>AI Assistant</h2>
        <p className="page-desc">Generate cover letters, analyze skills gaps, and more</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: 20 }}>
        <button className={tab === "generate" ? "active" : ""} onClick={() => setTab("generate")}>Generate</button>
        <button className={tab === "cover-letters" ? "active" : ""} onClick={() => setTab("cover-letters")}>Cover Letters ({storedLetters.length})</button>
        <button className={tab === "skill-gaps" ? "active" : ""} onClick={() => setTab("skill-gaps")}>Skill Gaps ({storedGaps.length})</button>
        <button className={tab === "pitch-analyses" ? "active" : ""} onClick={() => setTab("pitch-analyses")}>Pitches ({storedPitches.length})</button>
      </div>

      {/* GENERATE TAB */}
      {tab === "generate" && (
        <>
          <div className="glass-card" style={{ marginBottom: 20 }}>
            <div className="glass-card-body">
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <label>
                  Offer
                  <select value={selectedOffer} onChange={(e) => setSelectedOffer(e.target.value ? Number(e.target.value) : "")}>
                    <option value="">-- Select an offer --</option>
                    {offers.map((o) => <option key={o.id} value={o.id}>{o.company} - {o.title}</option>)}
                  </select>
                </label>
                <label>
                  Template (for cover letter)
                  <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value ? Number(e.target.value) : "")}>
                    <option value="">None</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
                <label>
                  LaTeX CV (for adaptation)
                  <select value={selectedCV} onChange={(e) => setSelectedCV(e.target.value ? Number(e.target.value) : "")}>
                    <option value="">-- Select a CV --</option>
                    {latexCvs.map((c) => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>)}
                  </select>
                </label>
                <div>
                  <div className="pitch-input-section">
                    <label style={{ marginBottom: 4 }}>Pitch audio</label>
                    <div className="pitch-mode-toggle">
                      <button className={pitchMode === "upload" ? "active" : ""} onClick={() => { setPitchMode("upload"); setPitchFile(null); }} disabled={recording}>Upload</button>
                      <button className={pitchMode === "record" ? "active" : ""} onClick={() => { setPitchMode("record"); setPitchFile(null); }} disabled={recording}>Record</button>
                    </div>
                    {pitchMode === "upload" && (
                      <input type="file" accept=".mp3,.wav,.webm,.ogg,.m4a,.flac" onChange={(e) => setPitchFile(e.target.files?.[0] ?? null)} style={{ marginTop: 6 }} />
                    )}
                    {pitchMode === "record" && (
                      <div className="recorder-controls" style={{ marginTop: 6 }}>
                        {!recording && !pitchFile && (
                          <button className="btn-record" onClick={startRecording} disabled={loading}>Start Recording</button>
                        )}
                        {recording && (
                          <div className="recording-indicator">
                            <span className="recording-dot" />
                            <span>{formatTime(recordingTime)}</span>
                            <button className="btn-record btn-stop" onClick={stopRecording}>Stop</button>
                          </div>
                        )}
                        {!recording && pitchFile && (
                          <div className="recording-ready">
                            <span>Recording ready ({pitchFile.name})</span>
                            <button onClick={() => setPitchFile(null)} className="btn-ghost" style={{ marginLeft: 8 }}>Discard</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="ai-buttons">
                <button onClick={handleSkillGap} disabled={!selectedOffer || loading}>
                  {loading ? "Analyzing..." : "Skill Gap"}
                </button>
                <button onClick={handleCoverLetter} disabled={!selectedOffer || loading}>
                  {loading ? "Generating..." : "Cover Letter"}
                </button>
                <button onClick={handleAdaptLatex} disabled={!selectedOffer || !selectedCV || loading}>
                  {loading ? "Adapting..." : "Adapt CV"}
                </button>
                <button onClick={handlePitchAnalysis} disabled={!pitchFile || loading}>
                  {loading ? "Analyzing..." : selectedOffer ? "Pitch (Offer)" : "Pitch (General)"}
                </button>
              </div>
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          {skillGap && (
            <SkillGapAccordion
              title={`Skill Gap: ${skillGap.company} - ${skillGap.offer_title}`}
              hardSkills={skillGap.missing_hard_skills}
              softSkills={skillGap.missing_soft_skills}
              recommendations={skillGap.recommendations}
              defaultOpen
            />
          )}

          {coverLetter && (
            <CoverLetterAccordion
              title={`Cover Letter: ${coverLetter.company} - ${coverLetter.offer_title}`}
              content={coverLetter.cover_letter}
              onDownload={() => downloadDocx(coverLetter.cover_letter, coverLetter.company)}
              defaultOpen
            />
          )}

          {pitchResult && (
            <PitchAnalysisAccordion
              title={`Pitch Analysis${pitchResult.company ? `: ${pitchResult.company} - ${pitchResult.offer_title}` : " (General)"}`}
              analysis={pitchResult}
              defaultOpen
            />
          )}

          {latexResult && (
            <div className="glass-card ai-result" style={{ marginTop: 16 }}>
              <div className="glass-card-header">
                <h3 style={{ margin: 0, flex: 1 }}>Adapted CV: {latexResult.company} - {latexResult.offer_title}</h3>
                <button className="btn-download" onClick={handleSaveLatex} disabled={savingLatex}>
                  {savingLatex ? "Compiling..." : "Save & Download"}
                </button>
                <button className="btn-download" onClick={handleDownloadPdfOnly} disabled={savingLatex} style={{ marginLeft: 8 }}>
                  {savingLatex ? "..." : "Download PDF"}
                </button>
              </div>
              <textarea
                className="latex-editor"
                value={editedLatex}
                onChange={(e) => setEditedLatex(e.target.value)}
                spellCheck={false}
              />
            </div>
          )}
        </>
      )}

      {/* COVER LETTERS HISTORY */}
      {tab === "cover-letters" && (
        <div className="card-list">
          {storedLetters.length === 0 && <p className="empty">No cover letters generated yet.</p>}
          {storedLetters.map((l) => (
            <CoverLetterAccordion
              key={l.id}
              title={`${l.company} - ${l.offer_title}`}
              content={l.content}
              date={l.created_at ? new Date(l.created_at).toLocaleDateString() : undefined}
              templateId={l.template_id}
              onDownload={() => downloadDocx(l.content, l.company)}
              onDelete={() => handleDeleteLetter(l.id)}
            />
          ))}
        </div>
      )}

      {/* SKILL GAPS HISTORY */}
      {tab === "skill-gaps" && (
        <div className="card-list">
          {storedGaps.length === 0 && <p className="empty">No skill gap analyses yet.</p>}
          {storedGaps.map((g) => (
            <SkillGapAccordion
              key={g.id}
              title={`${g.company} - ${g.offer_title}`}
              hardSkills={g.missing_hard_skills}
              softSkills={g.missing_soft_skills}
              recommendations={g.recommendations}
              date={g.created_at ? new Date(g.created_at).toLocaleDateString() : undefined}
              onDelete={() => handleDeleteGap(g.id)}
            />
          ))}
        </div>
      )}

      {/* PITCH ANALYSES HISTORY */}
      {tab === "pitch-analyses" && (
        <div className="card-list">
          {storedPitches.length === 0 && <p className="empty">No pitch analyses yet.</p>}
          {storedPitches.map((p) => (
            <PitchAnalysisAccordion
              key={p.id}
              title={p.company ? `${p.company} - ${p.offer_title}` : "General Pitch"}
              analysis={p}
              date={p.created_at ? new Date(p.created_at).toLocaleDateString() : undefined}
              onDelete={() => handleDeletePitch(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}


function CoverLetterAccordion({
  title, content, date, templateId, onDownload, onDelete, defaultOpen = false,
}: {
  title: string; content: string; date?: string; templateId?: number | null;
  onDownload: () => void; onDelete?: () => void; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <div className="glass-card" style={{ marginBottom: 8 }}>
      <div className="glass-card-header accordion-header" onClick={toggle}>
        <span className="accordion-chevron">{open ? "\u25BC" : "\u25B6"}</span>
        <strong style={{ flex: 1 }}>{title}</strong>
        {templateId && <span className="tag">template #{templateId}</span>}
        {date && <span className="hint" style={{ marginLeft: "auto" }}>{date}</span>}
        <button className="btn-download" onClick={(e) => { e.stopPropagation(); onDownload(); }} style={{ marginLeft: 8, padding: "4px 12px", fontSize: 12 }}>.docx</button>
        {onDelete && <button className="btn-delete" onClick={(e) => { e.stopPropagation(); onDelete(); }}>x</button>}
      </div>
      {open && <pre className="card-body">{content}</pre>}
    </div>
  );
}


function SkillGapAccordion({
  title, hardSkills, softSkills, recommendations, date, onDelete, defaultOpen = false,
}: {
  title: string; hardSkills: string[]; softSkills: string[]; recommendations: string[];
  date?: string; onDelete?: () => void; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <div className="glass-card" style={{ marginBottom: 8 }}>
      <div className="glass-card-header accordion-header" onClick={toggle}>
        <span className="accordion-chevron">{open ? "\u25BC" : "\u25B6"}</span>
        <strong style={{ flex: 1 }}>{title}</strong>
        {date && <span className="hint" style={{ marginLeft: "auto" }}>{date}</span>}
        {onDelete && <button className="btn-delete" onClick={(e) => { e.stopPropagation(); onDelete(); }}>x</button>}
      </div>
      {open && (
        <div style={{ padding: 18, fontSize: 13 }}>
          {hardSkills.length > 0 && (
            <>
              <h4 style={{ margin: "0 0 6px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>Missing Hard Skills</h4>
              <ul style={{ margin: "0 0 14px", paddingLeft: 20 }}>{hardSkills.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </>
          )}
          {softSkills.length > 0 && (
            <>
              <h4 style={{ margin: "0 0 6px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>Missing Soft Skills</h4>
              <ul style={{ margin: "0 0 14px", paddingLeft: 20 }}>{softSkills.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </>
          )}
          {recommendations.length > 0 && (
            <>
              <h4 style={{ margin: "0 0 6px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>Recommendations</h4>
              <ul style={{ margin: 0, paddingLeft: 20 }}>{recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}


function PitchAnalysisAccordion({
  title, analysis, date, onDelete, defaultOpen = false,
}: {
  title: string;
  analysis: {
    transcription: string; structure_clarity: string; strengths: string[];
    improvements: string[]; offer_relevance: string | null; overall_score: number; summary: string;
  };
  date?: string; onDelete?: () => void; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <div className="glass-card" style={{ marginBottom: 8 }}>
      <div className="glass-card-header accordion-header" onClick={toggle}>
        <span className="accordion-chevron">{open ? "\u25BC" : "\u25B6"}</span>
        <strong style={{ flex: 1 }}>{title}</strong>
        <span className="tag" style={{ marginLeft: 8 }}>Score: {analysis.overall_score}/10</span>
        {date && <span className="hint" style={{ marginLeft: "auto" }}>{date}</span>}
        {onDelete && <button className="btn-delete" onClick={(e) => { e.stopPropagation(); onDelete(); }}>x</button>}
      </div>
      {open && (
        <div style={{ padding: 18, fontSize: 13 }}>
          <h4 style={{ margin: "0 0 4px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>Summary</h4>
          <p style={{ margin: "0 0 14px" }}>{analysis.summary}</p>

          <h4 style={{ margin: "0 0 4px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>Structure & Clarity</h4>
          <p style={{ margin: "0 0 14px" }}>{analysis.structure_clarity}</p>

          {analysis.strengths.length > 0 && (
            <>
              <h4 style={{ margin: "0 0 4px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>Strengths</h4>
              <ul style={{ margin: "0 0 14px", paddingLeft: 20 }}>{analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </>
          )}

          {analysis.improvements.length > 0 && (
            <>
              <h4 style={{ margin: "0 0 4px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>Areas for Improvement</h4>
              <ul style={{ margin: "0 0 14px", paddingLeft: 20 }}>{analysis.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </>
          )}

          {analysis.offer_relevance && (
            <>
              <h4 style={{ margin: "0 0 4px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>Offer Relevance</h4>
              <p style={{ margin: "0 0 14px" }}>{analysis.offer_relevance}</p>
            </>
          )}

          <h4 style={{ margin: "0 0 4px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>Transcription</h4>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", background: "var(--accent-light)", padding: 12, borderRadius: 8, fontSize: 12 }}>
            {analysis.transcription}
          </pre>
        </div>
      )}
    </div>
  );
}
