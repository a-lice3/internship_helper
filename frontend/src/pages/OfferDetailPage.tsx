import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import * as api from "../api";

const STATUSES = ["bookmarked", "applied", "screened", "interview", "rejected", "accepted"];
const REMINDER_TYPES = ["deadline", "follow_up", "interview", "custom"];

export default function OfferDetailPage({ userId }: { userId: number }) {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const id = Number(offerId);

  const [offer, setOffer] = useState<api.Offer | null>(null);
  const [loading, setLoading] = useState(true);

  // Notes
  const [notes, setNotes] = useState<api.OfferNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");

  // Reminders for this offer
  const [reminders, setReminders] = useState<api.Reminder[]>([]);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDueAt, setReminderDueAt] = useState("");
  const [reminderType, setReminderType] = useState("follow_up");

  // AI actions
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [activeAI, setActiveAI] = useState<"cover-letter" | "skill-gap" | "adapt-cv" | "pitch" | null>(null);

  // Cover letter
  const [templates, setTemplates] = useState<api.Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | "">("");
  const [coverLetter, setCoverLetter] = useState<api.CoverLetterResult | null>(null);

  // Skill gap
  const [skillGap, setSkillGap] = useState<api.SkillGapResult | null>(null);

  // Adapt CV
  const [cvs, setCvs] = useState<api.CV[]>([]);
  const [selectedCV, setSelectedCV] = useState<number | "">("");
  const [latexResult, setLatexResult] = useState<api.AdaptCVLatexResult | null>(null);
  const [editedLatex, setEditedLatex] = useState("");
  const [savingLatex, setSavingLatex] = useState(false);

  // Pitch
  const [pitchMode, setPitchMode] = useState<"upload" | "record">("upload");
  const [pitchFile, setPitchFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pitchResult, setPitchResult] = useState<api.PitchAnalysisResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Editing offer
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    company: "", title: "", link: "", locations: "", description: "", status: "bookmarked", date_applied: "",
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.getOffer(userId, id),
      api.getOfferNotes(userId, id),
      api.getTemplates(userId),
      api.getCVs(userId),
      api.getReminders(userId, false),
    ]).then(([o, n, t, c, r]) => {
      setOffer(o);
      setNotes(n);
      setTemplates(t);
      setCvs(c);
      setReminders(r.filter((rem: api.Reminder) => rem.offer_id === id));
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [userId, id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!offer) return;
    const updated = await api.updateOffer(userId, offer.id, { status: newStatus });
    setOffer(updated);
  };

  const startEdit = () => {
    if (!offer) return;
    setEditing(true);
    setEditFields({
      company: offer.company, title: offer.title, link: offer.link || "",
      locations: offer.locations || "", description: offer.description || "",
      status: offer.status, date_applied: offer.date_applied || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!offer) return;
    const updated = await api.updateOffer(userId, offer.id, {
      company: editFields.company, title: editFields.title,
      link: editFields.link || undefined, locations: editFields.locations || undefined,
      description: editFields.description || undefined, status: editFields.status,
      date_applied: editFields.date_applied || undefined,
    });
    setOffer(updated);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!offer) return;
    await api.deleteOffer(userId, offer.id);
    navigate("/offers");
  };

  // Notes
  const handleAddNote = async () => {
    if (!newNote.trim() || !offer) return;
    const n = await api.createOfferNote(userId, offer.id, newNote);
    setNotes([n, ...notes]);
    setNewNote("");
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!offer) return;
    await api.deleteOfferNote(userId, offer.id, noteId);
    setNotes(notes.filter((n) => n.id !== noteId));
  };

  const handleSaveNoteEdit = async () => {
    if (editingNoteId === null || !offer) return;
    const updated = await api.updateOfferNote(userId, offer.id, editingNoteId, editNoteContent);
    setNotes(notes.map((n) => (n.id === updated.id ? updated : n)));
    setEditingNoteId(null);
  };

  // Reminders
  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTitle.trim() || !reminderDueAt) return;
    await api.createReminder(userId, {
      title: reminderTitle,
      due_at: new Date(reminderDueAt).toISOString(),
      reminder_type: reminderType,
      offer_id: id,
    });
    const r = await api.getReminders(userId, false);
    setReminders(r.filter((rem: api.Reminder) => rem.offer_id === id));
    setReminderTitle(""); setReminderDueAt(""); setShowAddReminder(false);
  };

  // AI: Cover letter
  const handleCoverLetter = async () => {
    setAiLoading(true); setAiError(""); setCoverLetter(null);
    try {
      const result = await api.generateCoverLetter(userId, id, selectedTemplate ? Number(selectedTemplate) : undefined);
      setCoverLetter(result);
    } catch (e: unknown) { setAiError(e instanceof Error ? e.message : "Unknown error"); }
    setAiLoading(false);
  };

  // AI: Skill gap
  const handleSkillGap = async () => {
    setAiLoading(true); setAiError(""); setSkillGap(null);
    try {
      const result = await api.analyzeSkillGap(userId, id);
      setSkillGap(result);
    } catch (e: unknown) { setAiError(e instanceof Error ? e.message : "Unknown error"); }
    setAiLoading(false);
  };

  // AI: Adapt CV
  const handleAdaptCV = async () => {
    if (!selectedCV) return;
    setAiLoading(true); setAiError(""); setLatexResult(null);
    try {
      const result = await api.adaptCVLatex(userId, id, Number(selectedCV));
      setLatexResult(result);
      setEditedLatex(result.adapted_latex);
    } catch (e: unknown) { setAiError(e instanceof Error ? e.message : "Unknown error"); }
    setAiLoading(false);
  };

  const handleSaveAdaptedCV = async () => {
    if (!latexResult || !offer) return;
    setSavingLatex(true); setAiError("");
    try {
      const saved = await api.saveCVWithLatex(userId, {
        name: `CV adapted - ${offer.company}`,
        content: "(LaTeX CV)",
        latex_content: editedLatex,
        support_files_dir: latexResult.support_files_dir,
        company: offer.company, job_title: offer.title, offer_id: id,
      });
      const blob = await api.compileCVPdf(userId, saved.id);
      saveAs(blob, `CV_${offer.company.replace(/\s+/g, "_")}.pdf`);
    } catch (e: unknown) { setAiError(e instanceof Error ? e.message : "Save/compile failed"); }
    setSavingLatex(false);
  };

  // AI: Pitch
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setPitchFile(new File([blob], "pitch-recording.webm", { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingTime(0);
      };
      mediaRecorder.start();
      setRecording(true); setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch { setAiError("Microphone access denied"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const handlePitchAnalysis = async () => {
    if (!pitchFile) return;
    setAiLoading(true); setAiError(""); setPitchResult(null);
    try {
      const result = await api.analyzePitchForOffer(userId, id, pitchFile);
      setPitchResult(result);
    } catch (e: unknown) { setAiError(e instanceof Error ? e.message : "Unknown error"); }
    setAiLoading(false);
  };

  const downloadDocx = useCallback(async (text: string, company: string) => {
    const paragraphs = text.split("\n").map(
      (line) => new Paragraph({ children: [new TextRun({ text: line, size: 24 })], spacing: { after: 120 } }),
    );
    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Cover_Letter_${company.replace(/\s+/g, "_")}.docx`);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (loading) return <div className="page"><p>Loading...</p></div>;
  if (!offer) return <div className="page"><p>Offer not found.</p> <button className="btn-secondary" onClick={() => navigate("/offers")}>Back to offers</button></div>;

  const latexCvs = cvs.filter((c) => c.latex_content);

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <button className="btn-ghost" onClick={() => navigate("/offers")} style={{ marginTop: 4 }}>&larr;</button>
        <div style={{ flex: 1 }}>
          {editing ? (
            <div className="form-grid" style={{ marginBottom: 12 }}>
              <input value={editFields.company} onChange={(e) => setEditFields({ ...editFields, company: e.target.value })} placeholder="Company" />
              <input value={editFields.title} onChange={(e) => setEditFields({ ...editFields, title: e.target.value })} placeholder="Title" />
              <input value={editFields.locations} onChange={(e) => setEditFields({ ...editFields, locations: e.target.value })} placeholder="Locations" />
              <input value={editFields.link} onChange={(e) => setEditFields({ ...editFields, link: e.target.value })} placeholder="Link" />
              <input type="date" value={editFields.date_applied} onChange={(e) => setEditFields({ ...editFields, date_applied: e.target.value })} />
              <select value={editFields.status} onChange={(e) => setEditFields({ ...editFields, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div style={{ gridColumn: "1 / -1" }}>
                <textarea value={editFields.description} onChange={(e) => setEditFields({ ...editFields, description: e.target.value })} placeholder="Description" rows={3} style={{ width: "100%" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-primary" onClick={handleSaveEdit} style={{ boxShadow: "none" }}>Save</button>
                <button className="btn-cancel" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0 }}>{offer.company}</h2>
                <span style={{ fontSize: 16, color: "var(--text-muted)" }}>{offer.title}</span>
                <span className={`status-dot ${offer.status}`} />
                <select
                  value={offer.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{ width: "auto", fontSize: 12, padding: "4px 8px" }}
                  className={`status-${offer.status}`}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, display: "flex", gap: 16 }}>
                {offer.locations && <span>{offer.locations}</span>}
                {offer.date_applied && <span>Applied: {offer.date_applied}</span>}
                {offer.link && <a href={offer.link} target="_blank" rel="noreferrer">View listing</a>}
              </div>
            </>
          )}
        </div>
        {!editing && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" onClick={startEdit}>Edit</button>
            <button className="btn-icon" onClick={handleDelete} title="Delete">x</button>
          </div>
        )}
      </div>

      <div className="bento-grid-2" style={{ marginTop: 20 }}>
        {/* Left column: description + notes */}
        <div>
          {/* Description */}
          {offer.description && (
            <div className="glass-card" style={{ marginBottom: 16 }}>
              <div className="glass-card-header"><h3>Description</h3></div>
              <div className="glass-card-body">
                <p style={{ fontSize: 13, whiteSpace: "pre-wrap", margin: 0 }}>{offer.description}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="glass-card" style={{ marginBottom: 16 }}>
            <div className="glass-card-header"><h3>Notes</h3></div>
            <div className="glass-card-body">
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(); }}
                  style={{ flex: 1 }}
                />
                <button className="btn-secondary" onClick={handleAddNote} style={{ padding: "6px 14px" }}>Add</button>
              </div>
              {notes.length === 0 ? (
                <p className="empty" style={{ margin: 0, fontSize: 13 }}>No notes yet</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {notes.map((n) => (
                    <div key={n.id} style={{ padding: "8px 12px", background: "var(--surface-solid)", borderRadius: 8, border: "1px solid var(--border)" }}>
                      {editingNoteId === n.id ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <textarea rows={2} value={editNoteContent} onChange={(e) => setEditNoteContent(e.target.value)} style={{ flex: 1 }} />
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <button className="btn-ghost" onClick={handleSaveNoteEdit} style={{ fontSize: 12 }}>Save</button>
                            <button className="btn-ghost" onClick={() => setEditingNoteId(null)} style={{ fontSize: 12 }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 13, whiteSpace: "pre-wrap", marginBottom: 4 }}>{n.content}</div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                            </span>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button className="btn-ghost" onClick={() => { setEditingNoteId(n.id); setEditNoteContent(n.content); }} style={{ fontSize: 11, padding: "2px 6px" }}>Edit</button>
                              <button className="btn-icon" onClick={() => handleDeleteNote(n.id)} style={{ fontSize: 11 }}>x</button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reminders for this offer */}
          <div className="glass-card">
            <div className="glass-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>Reminders</h3>
              <button className="btn-ghost" onClick={() => setShowAddReminder(!showAddReminder)} style={{ fontSize: 14, padding: "2px 8px" }}>
                {showAddReminder ? "Cancel" : "+"}
              </button>
            </div>
            <div className="glass-card-body">
              {showAddReminder && (
                <form onSubmit={handleAddReminder} style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <input placeholder="Title" value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} style={{ flex: 1, minWidth: 120 }} />
                  <select value={reminderType} onChange={(e) => setReminderType(e.target.value)} style={{ width: "auto" }}>
                    {REMINDER_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </select>
                  <input type="datetime-local" value={reminderDueAt} onChange={(e) => setReminderDueAt(e.target.value)} />
                  <button type="submit" className="btn-primary" style={{ boxShadow: "none" }}>Add</button>
                </form>
              )}
              {reminders.length === 0 ? (
                <p className="empty" style={{ margin: 0, fontSize: 13 }}>No reminders</p>
              ) : (
                <ul className="item-list" style={{ margin: 0 }}>
                  {reminders.map((r) => (
                    <li key={r.id} style={{ padding: "6px 0" }}>
                      <input type="checkbox" checked={r.is_done} onChange={async () => {
                        await api.updateReminder(userId, r.id, { is_done: !r.is_done });
                        const all = await api.getReminders(userId, false);
                        setReminders(all.filter((rem: api.Reminder) => rem.offer_id === id));
                      }} style={{ width: "auto" }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, textDecoration: r.is_done ? "line-through" : "none", color: r.is_done ? "var(--text-muted)" : "var(--text-h)" }}>{r.title}</span>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {new Date(r.due_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Right column: AI actions */}
        <div>
          <div className="glass-card" style={{ marginBottom: 16 }}>
            <div className="glass-card-header"><h3>AI Actions</h3></div>
            <div className="glass-card-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => { setActiveAI(activeAI === "cover-letter" ? null : "cover-letter"); }}
                  className={activeAI === "cover-letter" ? "btn-primary" : "btn-secondary"}
                  style={{ boxShadow: "none", textAlign: "left" }}
                >
                  Cover Letter
                </button>
                <button
                  onClick={() => { setActiveAI(activeAI === "skill-gap" ? null : "skill-gap"); }}
                  className={activeAI === "skill-gap" ? "btn-primary" : "btn-secondary"}
                  style={{ boxShadow: "none", textAlign: "left" }}
                >
                  Skill Gap Analysis
                </button>
                <button
                  onClick={() => { setActiveAI(activeAI === "adapt-cv" ? null : "adapt-cv"); }}
                  className={activeAI === "adapt-cv" ? "btn-primary" : "btn-secondary"}
                  style={{ boxShadow: "none", textAlign: "left" }}
                >
                  Adapt CV
                </button>
                <button
                  onClick={() => { setActiveAI(activeAI === "pitch" ? null : "pitch"); }}
                  className={activeAI === "pitch" ? "btn-primary" : "btn-secondary"}
                  style={{ boxShadow: "none", textAlign: "left" }}
                >
                  Analyze Pitch
                </button>
              </div>
            </div>
          </div>

          {aiError && <p className="error" style={{ marginBottom: 12 }}>{aiError}</p>}

          {/* Cover Letter panel */}
          {activeAI === "cover-letter" && (
            <div className="glass-card" style={{ marginBottom: 16 }}>
              <div className="glass-card-header"><h3>Generate Cover Letter</h3></div>
              <div className="glass-card-body">
                <label style={{ marginBottom: 8, display: "block" }}>
                  Template (optional)
                  <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value ? Number(e.target.value) : "")} style={{ width: "100%" }}>
                    <option value="">None</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
                <button onClick={handleCoverLetter} disabled={aiLoading} className="btn-primary" style={{ boxShadow: "none", width: "100%" }}>
                  {aiLoading ? "Generating..." : "Generate"}
                </button>
                {coverLetter && (
                  <div style={{ marginTop: 12 }}>
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "var(--surface-solid)", padding: 12, borderRadius: 8, maxHeight: 300, overflow: "auto" }}>
                      {coverLetter.cover_letter}
                    </pre>
                    <button onClick={() => downloadDocx(coverLetter.cover_letter, coverLetter.company)} className="btn-secondary" style={{ marginTop: 8, fontSize: 12 }}>
                      Download .docx
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Skill Gap panel */}
          {activeAI === "skill-gap" && (
            <div className="glass-card" style={{ marginBottom: 16 }}>
              <div className="glass-card-header"><h3>Skill Gap Analysis</h3></div>
              <div className="glass-card-body">
                <button onClick={handleSkillGap} disabled={aiLoading} className="btn-primary" style={{ boxShadow: "none", width: "100%" }}>
                  {aiLoading ? "Analyzing..." : "Analyze"}
                </button>
                {skillGap && (
                  <div style={{ marginTop: 12, fontSize: 13 }}>
                    {skillGap.missing_hard_skills.length > 0 && (
                      <>
                        <h4 style={{ margin: "0 0 6px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>Missing Hard Skills</h4>
                        <ul style={{ margin: "0 0 14px", paddingLeft: 20 }}>{skillGap.missing_hard_skills.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </>
                    )}
                    {skillGap.missing_soft_skills.length > 0 && (
                      <>
                        <h4 style={{ margin: "0 0 6px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>Missing Soft Skills</h4>
                        <ul style={{ margin: "0 0 14px", paddingLeft: 20 }}>{skillGap.missing_soft_skills.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </>
                    )}
                    {skillGap.recommendations.length > 0 && (
                      <>
                        <h4 style={{ margin: "0 0 6px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>Recommendations</h4>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>{skillGap.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Adapt CV panel */}
          {activeAI === "adapt-cv" && (
            <div className="glass-card" style={{ marginBottom: 16 }}>
              <div className="glass-card-header"><h3>Adapt CV</h3></div>
              <div className="glass-card-body">
                <label style={{ marginBottom: 8, display: "block" }}>
                  Select a LaTeX CV
                  <select value={selectedCV} onChange={(e) => setSelectedCV(e.target.value ? Number(e.target.value) : "")} style={{ width: "100%" }}>
                    <option value="">-- Select --</option>
                    {latexCvs.map((c) => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>)}
                  </select>
                </label>
                <button onClick={handleAdaptCV} disabled={!selectedCV || aiLoading} className="btn-primary" style={{ boxShadow: "none", width: "100%" }}>
                  {aiLoading ? "Adapting..." : "Adapt"}
                </button>
                {latexResult && (
                  <div style={{ marginTop: 12 }}>
                    <textarea className="latex-editor" value={editedLatex} onChange={(e) => setEditedLatex(e.target.value)} spellCheck={false} style={{ height: 200, width: "100%" }} />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={handleSaveAdaptedCV} disabled={savingLatex} className="btn-primary" style={{ boxShadow: "none", fontSize: 12 }}>
                        {savingLatex ? "Compiling..." : "Save & Download PDF"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pitch panel */}
          {activeAI === "pitch" && (
            <div className="glass-card" style={{ marginBottom: 16 }}>
              <div className="glass-card-header"><h3>Analyze Pitch</h3></div>
              <div className="glass-card-body">
                <div className="pitch-mode-toggle" style={{ marginBottom: 8 }}>
                  <button className={pitchMode === "upload" ? "active" : ""} onClick={() => { setPitchMode("upload"); setPitchFile(null); }} disabled={recording}>Upload</button>
                  <button className={pitchMode === "record" ? "active" : ""} onClick={() => { setPitchMode("record"); setPitchFile(null); }} disabled={recording}>Record</button>
                </div>
                {pitchMode === "upload" && (
                  <input type="file" accept=".mp3,.wav,.webm,.ogg,.m4a,.flac" onChange={(e) => setPitchFile(e.target.files?.[0] ?? null)} style={{ marginBottom: 8, width: "100%" }} />
                )}
                {pitchMode === "record" && (
                  <div style={{ marginBottom: 8 }}>
                    {!recording && !pitchFile && (
                      <button className="btn-secondary" onClick={startRecording} style={{ width: "100%" }}>Start Recording</button>
                    )}
                    {recording && (
                      <div className="recording-indicator" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="recording-dot" />
                        <span>{formatTime(recordingTime)}</span>
                        <button className="btn-danger" onClick={stopRecording} style={{ marginLeft: "auto" }}>Stop</button>
                      </div>
                    )}
                    {!recording && pitchFile && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                        <span>Recording ready</span>
                        <button onClick={() => setPitchFile(null)} className="btn-ghost" style={{ fontSize: 12 }}>Discard</button>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={handlePitchAnalysis} disabled={!pitchFile || aiLoading} className="btn-primary" style={{ boxShadow: "none", width: "100%" }}>
                  {aiLoading ? "Analyzing..." : "Analyze"}
                </button>
                {pitchResult && (
                  <div style={{ marginTop: 12, fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <strong>Score: {pitchResult.overall_score}/10</strong>
                    </div>
                    <p style={{ margin: "0 0 8px" }}>{pitchResult.summary}</p>
                    {pitchResult.strengths.length > 0 && (
                      <>
                        <h4 style={{ margin: "0 0 4px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>Strengths</h4>
                        <ul style={{ margin: "0 0 8px", paddingLeft: 20 }}>{pitchResult.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </>
                    )}
                    {pitchResult.improvements.length > 0 && (
                      <>
                        <h4 style={{ margin: "0 0 4px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>Improvements</h4>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>{pitchResult.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
