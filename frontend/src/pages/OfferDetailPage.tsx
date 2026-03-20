import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { useTranslation } from "react-i18next";
import * as api from "../api";
import DateTimeInput from "../components/DateTimeInput";
import { getStatusLabel, getReminderTypeLabel, STATUSES, REMINDER_TYPES } from "../i18n/helpers";

const mistralLogo = "/logo_mistral.png";

export default function OfferDetailPage({ userId }: { userId: number }) {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  // Editing reminder
  const [editingReminderId, setEditingReminderId] = useState<number | null>(null);
  const [editReminderTitle, setEditReminderTitle] = useState("");
  const [editReminderDueAt, setEditReminderDueAt] = useState("");
  const [editReminderType, setEditReminderType] = useState("follow_up");

  // AI actions
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [activeAI, setActiveAI] = useState<"cover-letter" | "skill-gap" | "adapt-cv" | "pitch" | null>(null);

  // Company info (Wikipedia)
  const [companyInfo, setCompanyInfo] = useState<api.CompanyInfo | null>(null);

  // Cover letter
  const [templates, setTemplates] = useState<api.Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | "">("");
  const [coverLetter, setCoverLetter] = useState<api.CoverLetterResult | null>(null);
  const [storedCoverLetter, setStoredCoverLetter] = useState<api.StoredCoverLetter | null>(null);
  const [editableCoverLetter, setEditableCoverLetter] = useState("");
  const [clChatInput, setClChatInput] = useState("");
  const [clChatHistory, setClChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [clChatLoading, setClChatLoading] = useState(false);
  const [clSaving, setClSaving] = useState(false);
  const [clEdited, setClEdited] = useState(false);

  // Skill gap
  const [skillGap, setSkillGap] = useState<api.SkillGapResult | null>(null);
  const [storedSkillGap, setStoredSkillGap] = useState<api.StoredSkillGap | null>(null);

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

  // Auto-generate on first visit
  const [autoGenerating, setAutoGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      api.getOffer(userId, id),
      api.getOfferNotes(userId, id),
      api.getTemplates(userId),
      api.getCVs(userId),
      api.getReminders(userId, true),
      api.getStoredSkillGaps(userId),
      api.getStoredCoverLetters(userId),
    ]).then(([o, n, t, c, r, sgs, cls]) => {
      if (cancelled) return;
      setOffer(o);
      setNotes(n);
      setTemplates(t);

      // Fetch company info from Wikipedia (non-blocking)
      api.getCompanyInfo(o.company).then((info) => {
        if (!cancelled && info.extract) setCompanyInfo(info);
      }).catch(() => {});
      setCvs(c);
      setReminders(r.filter((rem: api.Reminder) => rem.offer_id === id));

      // Find existing generations for this offer
      const existingSG = sgs.find((sg: api.StoredSkillGap) => sg.offer_id === id) || null;
      const existingCL = cls.find((cl: api.StoredCoverLetter) => cl.offer_id === id) || null;
      setStoredSkillGap(existingSG);
      setStoredCoverLetter(existingCL);
      if (existingCL) setEditableCoverLetter(existingCL.content);

      // If no generations exist, auto-generate
      if (!existingSG && !existingCL) {
        setAutoGenerating(true);
        Promise.allSettled([
          api.analyzeSkillGap(userId, id),
          api.generateCoverLetter(userId, id),
        ]).then(([sgResult, clResult]) => {
          if (cancelled) return;
          if (sgResult.status === "fulfilled") {
            const sg = sgResult.value;
            setStoredSkillGap({ id: sg.id, offer_id: id, offer_title: sg.offer_title, company: sg.company, missing_hard_skills: sg.missing_hard_skills, missing_soft_skills: sg.missing_soft_skills, recommendations: sg.recommendations, created_at: null });
            setSkillGap(sg);
          }
          if (clResult.status === "fulfilled") {
            const cl = clResult.value;
            setStoredCoverLetter({ id: cl.id, offer_id: id, template_id: null, offer_title: cl.offer_title, company: cl.company, content: cl.cover_letter, created_at: null });
            setCoverLetter(cl);
            setEditableCoverLetter(cl.cover_letter);
          }
          setAutoGenerating(false);
        });
      }

      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
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
    await reloadReminders();
    setReminderTitle(""); setReminderDueAt(""); setReminderType("follow_up"); setShowAddReminder(false);
  };

  const reloadReminders = async () => {
    const r = await api.getReminders(userId, true);
    setReminders(r.filter((rem: api.Reminder) => rem.offer_id === id));
  };

  const handleToggleReminder = async (r: api.Reminder) => {
    await api.updateReminder(userId, r.id, { is_done: !r.is_done });
    await reloadReminders();
  };

  const handleDeleteReminder = async (remId: number) => {
    await api.deleteReminder(userId, remId);
    setReminders(reminders.filter((r) => r.id !== remId));
  };

  const startEditReminder = (r: api.Reminder) => {
    setEditingReminderId(r.id);
    setEditReminderTitle(r.title);
    setEditReminderDueAt(r.due_at.slice(0, 16));
    setEditReminderType(r.reminder_type);
  };

  const handleSaveEditReminder = async () => {
    if (editingReminderId === null) return;
    await api.updateReminder(userId, editingReminderId, {
      title: editReminderTitle,
      due_at: new Date(editReminderDueAt).toISOString(),
      reminder_type: editReminderType,
    });
    setEditingReminderId(null);
    await reloadReminders();
  };

  // AI: Cover letter
  const handleCoverLetter = async (templateId?: number) => {
    setAiLoading(true); setAiError(""); setCoverLetter(null);
    try {
      const result = await api.generateCoverLetter(userId, id, templateId);
      setCoverLetter(result);
      setStoredCoverLetter({ id: result.id, offer_id: id, template_id: templateId ?? null, offer_title: result.offer_title, company: result.company, content: result.cover_letter, created_at: null });
      setEditableCoverLetter(result.cover_letter);
      setClChatHistory([]);
      setClEdited(false);
    } catch (e: unknown) { setAiError(e instanceof Error ? e.message : "Unknown error"); }
    setAiLoading(false);
  };

  // Cover letter: chat edit via Mistral
  const handleCLChatSend = async () => {
    if (!clChatInput.trim() || !storedCoverLetter) return;
    const message = clChatInput.trim();
    setClChatInput("");
    setClChatLoading(true); setAiError("");
    try {
      const result = await api.chatEditCoverLetter(
        userId, storedCoverLetter.id, editableCoverLetter, message, clChatHistory,
      );
      setEditableCoverLetter(result.updated_content);
      setStoredCoverLetter({ ...storedCoverLetter, content: result.updated_content });
      setCoverLetter((prev) => prev ? { ...prev, cover_letter: result.updated_content } : prev);
      setClChatHistory([...clChatHistory, { role: "user", content: message }, { role: "assistant", content: result.updated_content }]);
      setClEdited(false);
    } catch (e: unknown) { setAiError(e instanceof Error ? e.message : "Unknown error"); }
    setClChatLoading(false);
  };

  // Cover letter: save manual edits
  const handleSaveCoverLetter = async () => {
    if (!storedCoverLetter) return;
    setClSaving(true); setAiError("");
    try {
      await api.updateCoverLetterContent(userId, storedCoverLetter.id, editableCoverLetter);
      setStoredCoverLetter({ ...storedCoverLetter, content: editableCoverLetter });
      setCoverLetter((prev) => prev ? { ...prev, cover_letter: editableCoverLetter } : prev);
      setClEdited(false);
    } catch (e: unknown) { setAiError(e instanceof Error ? e.message : "Unknown error"); }
    setClSaving(false);
  };

  // AI: Skill gap
  const handleSkillGap = async () => {
    setAiLoading(true); setAiError(""); setSkillGap(null);
    try {
      const result = await api.analyzeSkillGap(userId, id);
      setSkillGap(result);
      setStoredSkillGap({ id: result.id, offer_id: id, offer_title: result.offer_title, company: result.company, missing_hard_skills: result.missing_hard_skills, missing_soft_skills: result.missing_soft_skills, recommendations: result.recommendations, created_at: null });
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
    } catch { setAiError(t("offerDetail.micDenied")); }
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

  const stripMarkdown = useCallback((text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, "$1")  // bold
      .replace(/\*(.+?)\*/g, "$1")      // italic
      .replace(/__(.+?)__/g, "$1")       // bold alt
      .replace(/_(.+?)_/g, "$1")         // italic alt
      .replace(/^#{1,6}\s+/gm, "")      // headers
      .replace(/^[-*+]\s+/gm, "")       // bullet points
      .replace(/^\d+\.\s+/gm, "");      // numbered lists
  }, []);

  const downloadDocx = useCallback(async (text: string, company: string) => {
    const clean = stripMarkdown(text);
    const paragraphs = clean.split("\n").map(
      (line) => new Paragraph({ children: [new TextRun({ text: line, size: 24 })], spacing: { after: 120 } }),
    );
    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Cover_Letter_${company.replace(/\s+/g, "_")}.docx`);
  }, [stripMarkdown]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Helper to get the cover letter content to display
  const displayCoverLetter = coverLetter?.cover_letter || storedCoverLetter?.content || null;
  const displayCoverLetterCompany = coverLetter?.company || storedCoverLetter?.company || offer?.company || "";

  // Helper to get the skill gap to display
  const displaySkillGap = skillGap || (storedSkillGap ? {
    id: storedSkillGap.id,
    offer_title: storedSkillGap.offer_title,
    company: storedSkillGap.company,
    missing_hard_skills: storedSkillGap.missing_hard_skills,
    missing_soft_skills: storedSkillGap.missing_soft_skills,
    recommendations: storedSkillGap.recommendations,
  } : null);

  if (loading) return <div className="page"><p>{t("offerDetail.loading")}</p></div>;
  if (!offer) return <div className="page"><p>{t("offerDetail.notFound")}</p> <button className="btn-secondary" onClick={() => navigate("/offers")}>{t("offerDetail.backToOffers")}</button></div>;

  const latexCvs = cvs.filter((c) => c.latex_content);

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <button className="btn-ghost" onClick={() => navigate("/offers")} style={{ marginTop: 4 }}>&larr;</button>
        <div style={{ flex: 1 }}>
          {editing ? (
            <div className="form-grid" style={{ marginBottom: 12 }}>
              <input value={editFields.company} onChange={(e) => setEditFields({ ...editFields, company: e.target.value })} placeholder={t("offerDetail.company")} />
              <input value={editFields.title} onChange={(e) => setEditFields({ ...editFields, title: e.target.value })} placeholder={t("offerDetail.titleField")} />
              <input value={editFields.locations} onChange={(e) => setEditFields({ ...editFields, locations: e.target.value })} placeholder={t("offerDetail.locations")} />
              <input value={editFields.link} onChange={(e) => setEditFields({ ...editFields, link: e.target.value })} placeholder={t("offerDetail.linkField")} />
              <DateTimeInput mode="date" value={editFields.date_applied} onChange={(v) => setEditFields({ ...editFields, date_applied: v })} placeholder={t("offerDetail.dateApplied")} />
              <select value={editFields.status} onChange={(e) => setEditFields({ ...editFields, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{getStatusLabel(t, s)}</option>)}
              </select>
              <div style={{ gridColumn: "1 / -1" }}>
                <textarea value={editFields.description} onChange={(e) => setEditFields({ ...editFields, description: e.target.value })} placeholder={t("offerDetail.description")} rows={3} style={{ width: "100%" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-primary" onClick={handleSaveEdit} style={{ boxShadow: "none" }}>{t("offerDetail.save")}</button>
                <button className="btn-cancel" onClick={() => setEditing(false)}>{t("offerDetail.cancel")}</button>
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
                  {STATUSES.map((s) => <option key={s} value={s}>{getStatusLabel(t, s)}</option>)}
                </select>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, display: "flex", gap: 16 }}>
                {offer.locations && <span>{offer.locations}</span>}
                {offer.date_applied && offer.status !== "bookmarked" && <span>{t("offerDetail.applied")} {offer.date_applied}</span>}
                {offer.link && <a href={offer.link} target="_blank" rel="noreferrer">{t("offerDetail.link")}</a>}
              </div>
            </>
          )}
        </div>
        {!editing && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" onClick={startEdit}>{t("offerDetail.edit")}</button>
            <button className="btn-icon" onClick={handleDelete} title={t("offerDetail.delete")}>x</button>
          </div>
        )}
      </div>

      {/* Auto-generating spinner */}
      {autoGenerating && (
        <div className="mistral-generating-banner">
          <img src={mistralLogo} alt="Loading" className="mistral-spin-img" />
          <span>{t("offerDetail.generatingBanner")}</span>
        </div>
      )}

      {/* Company info from Wikipedia */}
      {companyInfo && companyInfo.extract && (
        <div className="glass-card" style={{ marginTop: 20 }}>
          <div className="glass-card-header">
            <h3 style={{ margin: 0 }}>{t("offerDetail.about", { company: offer.company })}</h3>
          </div>
          <div className="glass-card-body" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {companyInfo.logo_url && (
              <img src={companyInfo.logo_url} alt={offer.company} style={{ width: 60, height: 60, objectFit: "contain", borderRadius: 8, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              {companyInfo.description && (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, fontStyle: "italic" }}>{companyInfo.description}</div>
              )}
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>{companyInfo.extract}</p>
              {companyInfo.page_url && (
                <a href={companyInfo.page_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, marginTop: 6, display: "inline-block" }}>
                  {t("offerDetail.wikipedia")}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Row 1: Description + Skill Gap side by side */}
      <div className="bento-grid-2" style={{ marginTop: 16 }}>
        {/* Description */}
        {offer.description && (
          <div className="glass-card">
            <div className="glass-card-header"><h3>{t("offerDetail.description")}</h3></div>
            <div className="glass-card-body">
              <p style={{ fontSize: 13, whiteSpace: "pre-wrap", margin: 0, maxHeight: 300, overflowY: "auto" }}>{offer.description}</p>
            </div>
          </div>
        )}

        {/* Skill Gap */}
        <div className="glass-card">
          <div className="glass-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0 }}>{t("offerDetail.skillGapAnalysis")}</h3>
            <button
              className="btn-ghost"
              onClick={handleSkillGap}
              disabled={aiLoading}
              style={{ fontSize: 12, padding: "2px 8px" }}
            >
              {aiLoading && activeAI === "skill-gap" ? t("offerDetail.generating") : t("offerDetail.regenerate")}
            </button>
          </div>
          <div className="glass-card-body" style={{ maxHeight: 300, overflowY: "auto" }}>
            {displaySkillGap ? (
              <div style={{ fontSize: 13 }}>
                {displaySkillGap.missing_hard_skills.length > 0 && (
                  <>
                    <h4 style={{ margin: "0 0 6px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>{t("offerDetail.missingHardSkills")}</h4>
                    <ul style={{ margin: "0 0 14px", paddingLeft: 20 }}>{displaySkillGap.missing_hard_skills.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </>
                )}
                {displaySkillGap.missing_soft_skills.length > 0 && (
                  <>
                    <h4 style={{ margin: "0 0 6px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>{t("offerDetail.missingSoftSkills")}</h4>
                    <ul style={{ margin: "0 0 14px", paddingLeft: 20 }}>{displaySkillGap.missing_soft_skills.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </>
                )}
                {displaySkillGap.recommendations.length > 0 && (
                  <>
                    <h4 style={{ margin: "0 0 6px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>{t("offerDetail.recommendations")}</h4>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>{displaySkillGap.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  </>
                )}
              </div>
            ) : autoGenerating ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src={mistralLogo} alt="Loading" className="mistral-spin-img" style={{ width: 20, height: 20 }} />
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("offerDetail.generating")}</span>
              </div>
            ) : (
              <p className="empty" style={{ margin: 0, fontSize: 13 }}>{t("offerDetail.notGenerated")}</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Cover Letter — full width */}
      <div className="glass-card" style={{ marginTop: 16 }}>
        <div className="glass-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>{t("offerDetail.coverLetter")}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value ? Number(e.target.value) : "")}
              style={{ width: "auto", fontSize: 11, padding: "2px 6px" }}
            >
              <option value="">{t("offerDetail.noTemplate")}</option>
              {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
            </select>
            <button
              className="btn-ghost"
              onClick={() => handleCoverLetter(selectedTemplate ? Number(selectedTemplate) : undefined)}
              disabled={aiLoading}
              style={{ fontSize: 12, padding: "2px 8px" }}
            >
              {aiLoading && activeAI === "cover-letter" ? t("offerDetail.generating") : t("offerDetail.regenerate")}
            </button>
          </div>
        </div>
        <div className="glass-card-body">
          {displayCoverLetter ? (
            <div>
              {/* Editable textarea — full width for comfortable editing */}
              <textarea
                value={editableCoverLetter}
                onChange={(e) => { setEditableCoverLetter(e.target.value); setClEdited(true); }}
                style={{ width: "100%", minHeight: 280, maxHeight: 500, fontSize: 13, background: "var(--surface-solid)", padding: 16, borderRadius: 8, border: "1px solid var(--border)", resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }}
              />

              {/* Action buttons + Mistral chat on same row */}
              <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {clEdited && (
                    <button onClick={handleSaveCoverLetter} disabled={clSaving} className="btn-primary" style={{ boxShadow: "none", fontSize: 12 }}>
                      {clSaving ? t("settings.saving") : t("offerDetail.saveChanges")}
                    </button>
                  )}
                  <button onClick={() => downloadDocx(editableCoverLetter, displayCoverLetterCompany)} className="btn-secondary" style={{ fontSize: 12 }}>
                    {t("offerDetail.downloadDocx")}
                  </button>
                </div>
                <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center", minWidth: 280 }}>
                  <img src={mistralLogo} alt="Mistral" style={{ width: 22, height: 22, opacity: 0.8 }} />
                  <input
                    placeholder={t("offerDetail.askMistral")}
                    value={clChatInput}
                    onChange={(e) => setClChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCLChatSend(); } }}
                    disabled={clChatLoading}
                    style={{ flex: 1, fontSize: 12 }}
                  />
                  <button onClick={handleCLChatSend} disabled={clChatLoading || !clChatInput.trim()} className="btn-primary" style={{ boxShadow: "none", fontSize: 12, padding: "6px 14px" }}>
                    {clChatLoading ? "..." : t("offerDetail.send")}
                  </button>
                </div>
              </div>
              {clChatLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <img src={mistralLogo} alt="Loading" className="mistral-spin-img" style={{ width: 16, height: 16 }} />
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("offerDetail.modifyingLetter")}</span>
                </div>
              )}
            </div>
          ) : autoGenerating ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src={mistralLogo} alt="Loading" className="mistral-spin-img" style={{ width: 20, height: 20 }} />
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("offerDetail.generating")}</span>
            </div>
          ) : (
            <p className="empty" style={{ margin: 0, fontSize: 13 }}>{t("offerDetail.notGenerated")}</p>
          )}
        </div>
      </div>

      {/* Row 3: Notes + Reminders/AI Actions side by side */}
      <div className="bento-grid-2" style={{ marginTop: 16 }}>
        {/* Notes */}
        <div className="glass-card">
          <div className="glass-card-header"><h3>{t("offerDetail.notes")}</h3></div>
          <div className="glass-card-body">
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                placeholder={t("offerDetail.addNote")}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(); }}
                style={{ flex: 1 }}
              />
              <button className="btn-secondary" onClick={handleAddNote} style={{ padding: "6px 14px" }}>{t("offerDetail.addBtn")}</button>
            </div>
            {notes.length === 0 ? (
              <p className="empty" style={{ margin: 0, fontSize: 13 }}>{t("offerDetail.noNotes")}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {notes.map((n) => (
                  <div key={n.id} style={{ padding: "8px 12px", background: "var(--surface-solid)", borderRadius: 8, border: "1px solid var(--border)" }}>
                    {editingNoteId === n.id ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <textarea rows={2} value={editNoteContent} onChange={(e) => setEditNoteContent(e.target.value)} style={{ flex: 1 }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <button className="btn-ghost" onClick={handleSaveNoteEdit} style={{ fontSize: 12 }}>{t("offerDetail.save")}</button>
                          <button className="btn-ghost" onClick={() => setEditingNoteId(null)} style={{ fontSize: 12 }}>{t("offerDetail.cancel")}</button>
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
                            <button className="btn-ghost" onClick={() => { setEditingNoteId(n.id); setEditNoteContent(n.content); }} style={{ fontSize: 11, padding: "2px 6px" }}>{t("offerDetail.edit")}</button>
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

        {/* Right: Reminders + AI Actions */}
        <div>
          {/* Reminders */}
          <div className="glass-card" style={{ marginBottom: 16 }}>
            <div className="glass-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>{t("offerDetail.reminders")}</h3>
              <button className="btn-ghost" onClick={() => setShowAddReminder(true)} style={{ fontSize: 14, padding: "2px 8px" }}>+</button>
            </div>
            <div className="glass-card-body">
              {reminders.length === 0 ? (
                <p className="empty" style={{ margin: 0, fontSize: 13 }}>{t("offerDetail.noReminders")}</p>
              ) : (
                <ul className="item-list" style={{ margin: 0 }}>
                  {reminders.map((r) =>
                    editingReminderId === r.id ? (
                      <li key={r.id} style={{ flexDirection: "column", gap: 8, padding: "8px 0", alignItems: "stretch" }}>
                        <input placeholder={t("offerDetail.titleField")} value={editReminderTitle} onChange={(e) => setEditReminderTitle(e.target.value)} style={{ fontSize: 13 }} />
                        <select value={editReminderType} onChange={(e) => setEditReminderType(e.target.value)} style={{ fontSize: 13 }}>
                          {REMINDER_TYPES.map((rt) => <option key={rt} value={rt}>{getReminderTypeLabel(t, rt)}</option>)}
                        </select>
                        <DateTimeInput value={editReminderDueAt} onChange={setEditReminderDueAt} style={{ fontSize: 13 }} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn-primary" onClick={handleSaveEditReminder} style={{ boxShadow: "none", fontSize: 12 }}>{t("offerDetail.save")}</button>
                          <button className="btn-cancel" onClick={() => setEditingReminderId(null)} style={{ fontSize: 12 }}>{t("offerDetail.cancel")}</button>
                        </div>
                      </li>
                    ) : (
                      <li key={r.id} style={{ padding: "6px 0" }}>
                        <button
                          className={`reminder-toggle${r.is_done ? " done" : ""}`}
                          onClick={() => handleToggleReminder(r)}
                          title={r.is_done ? t("offerDetail.markUndone") : t("offerDetail.markDone")}
                        >{r.is_done ? "\u2713" : ""}</button>
                        <div style={{ flex: 1, cursor: "pointer" }} onClick={() => startEditReminder(r)}>
                          <span style={{
                            fontSize: 13, fontWeight: 500,
                            color: r.is_done ? "var(--text-muted)" : "var(--text-h)",
                            textDecoration: r.is_done ? "line-through" : "none",
                          }}>{r.title}</span>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {new Date(r.due_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteReminder(r.id)} className="btn-icon" title={t("offerDetail.delete")} style={{ fontSize: 11, padding: "2px 6px" }}>x</button>
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Add reminder modal */}
          {showAddReminder && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 2000,
            }} onClick={(e) => { if (e.target === e.currentTarget) setShowAddReminder(false); }}>
              <div className="glass-card" style={{ width: 400, maxWidth: "90vw", overflow: "visible" }}>
                <div className="glass-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h3 style={{ margin: 0 }}>{t("offerDetail.newReminder")}</h3>
                  <button className="btn-ghost" onClick={() => setShowAddReminder(false)} style={{ fontSize: 16, padding: "2px 8px" }}>x</button>
                </div>
                <div className="glass-card-body" style={{ overflow: "visible" }}>
                  <form onSubmit={handleAddReminder} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label>
                      {t("offerDetail.titleRequired")}
                      <input placeholder={t("offerDetail.reminderPlaceholder")} value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} />
                    </label>
                    <label>
                      {t("offerDetail.typeLabel")}
                      <select value={reminderType} onChange={(e) => setReminderType(e.target.value)}>
                        {REMINDER_TYPES.map((rt) => <option key={rt} value={rt}>{getReminderTypeLabel(t, rt)}</option>)}
                      </select>
                    </label>
                    <label>
                      {t("offerDetail.dueDateRequired")}
                      <DateTimeInput value={reminderDueAt} onChange={setReminderDueAt} />
                    </label>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                      <button type="button" className="btn-cancel" onClick={() => setShowAddReminder(false)}>{t("offerDetail.cancel")}</button>
                      <button type="submit" className="btn-primary" style={{ boxShadow: "none" }}>{t("offerDetail.addReminder")}</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* AI Actions */}
          <div className="glass-card">
            <div className="glass-card-header"><h3>{t("offerDetail.aiActions")}</h3></div>
            <div className="glass-card-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => { setActiveAI(activeAI === "adapt-cv" ? null : "adapt-cv"); }}
                  className={activeAI === "adapt-cv" ? "btn-primary" : "btn-secondary"}
                  style={{ boxShadow: "none", textAlign: "left" }}
                >
                  {t("offerDetail.adaptCV")}
                </button>
                <button
                  onClick={() => { setActiveAI(activeAI === "pitch" ? null : "pitch"); }}
                  className={activeAI === "pitch" ? "btn-primary" : "btn-secondary"}
                  style={{ boxShadow: "none", textAlign: "left" }}
                >
                  {t("offerDetail.analyzePitch")}
                </button>
              </div>
            </div>
          </div>

          {aiError && <p className="error" style={{ marginTop: 12 }}>{aiError}</p>}

          {/* Adapt CV panel */}
          {activeAI === "adapt-cv" && (
            <div className="glass-card" style={{ marginTop: 16 }}>
              <div className="glass-card-header"><h3>{t("offerDetail.adaptCV")}</h3></div>
              <div className="glass-card-body">
                <label style={{ marginBottom: 8, display: "block" }}>
                  {t("offerDetail.selectLatexCV")}
                  <select value={selectedCV} onChange={(e) => setSelectedCV(e.target.value ? Number(e.target.value) : "")} style={{ width: "100%" }}>
                    <option value="">{t("offerDetail.select")}</option>
                    {latexCvs.map((c) => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>)}
                  </select>
                </label>
                <button onClick={handleAdaptCV} disabled={!selectedCV || aiLoading} className="btn-primary" style={{ boxShadow: "none", width: "100%" }}>
                  {aiLoading ? t("offerDetail.adapting") : t("offerDetail.adapt")}
                </button>
                {latexResult && (
                  <div style={{ marginTop: 12 }}>
                    <textarea className="latex-editor" value={editedLatex} onChange={(e) => setEditedLatex(e.target.value)} spellCheck={false} style={{ height: 200, width: "100%" }} />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={handleSaveAdaptedCV} disabled={savingLatex} className="btn-primary" style={{ boxShadow: "none", fontSize: 12 }}>
                        {savingLatex ? t("offerDetail.compiling") : t("offerDetail.saveDownloadPDF")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pitch panel */}
          {activeAI === "pitch" && (
            <div className="glass-card" style={{ marginTop: 16 }}>
              <div className="glass-card-header"><h3>{t("offerDetail.analyzePitch")}</h3></div>
              <div className="glass-card-body">
                <div className="pitch-mode-toggle" style={{ marginBottom: 8 }}>
                  <button className={pitchMode === "upload" ? "active" : ""} onClick={() => { setPitchMode("upload"); setPitchFile(null); }} disabled={recording}>{t("aiPage.upload")}</button>
                  <button className={pitchMode === "record" ? "active" : ""} onClick={() => { setPitchMode("record"); setPitchFile(null); }} disabled={recording}>{t("aiPage.record")}</button>
                </div>
                {pitchMode === "upload" && (
                  <input type="file" accept=".mp3,.wav,.webm,.ogg,.m4a,.flac" onChange={(e) => setPitchFile(e.target.files?.[0] ?? null)} style={{ marginBottom: 8, width: "100%" }} />
                )}
                {pitchMode === "record" && (
                  <div style={{ marginBottom: 8 }}>
                    {!recording && !pitchFile && (
                      <button className="btn-secondary" onClick={startRecording} style={{ width: "100%" }}>{t("offerDetail.startRecording")}</button>
                    )}
                    {recording && (
                      <div className="recording-indicator" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="recording-dot" />
                        <span>{formatTime(recordingTime)}</span>
                        <button className="btn-danger" onClick={stopRecording} style={{ marginLeft: "auto" }}>{t("aiPage.stop")}</button>
                      </div>
                    )}
                    {!recording && pitchFile && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                        <span>{t("offerDetail.recordingReady")}</span>
                        <button onClick={() => setPitchFile(null)} className="btn-ghost" style={{ fontSize: 12 }}>{t("offerDetail.discardBtn")}</button>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={handlePitchAnalysis} disabled={!pitchFile || aiLoading} className="btn-primary" style={{ boxShadow: "none", width: "100%" }}>
                  {aiLoading ? t("interviewPage.analyzing") : t("offerDetail.analyze")}
                </button>
                {pitchResult && (
                  <div style={{ marginTop: 12, fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <strong>{t("offerDetail.score")} {pitchResult.overall_score}/10</strong>
                    </div>
                    <p style={{ margin: "0 0 8px" }}>{pitchResult.summary}</p>
                    {pitchResult.strengths.length > 0 && (
                      <>
                        <h4 style={{ margin: "0 0 4px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>{t("offerDetail.strengths")}</h4>
                        <ul style={{ margin: "0 0 8px", paddingLeft: 20 }}>{pitchResult.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </>
                    )}
                    {pitchResult.improvements.length > 0 && (
                      <>
                        <h4 style={{ margin: "0 0 4px", textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>{t("offerDetail.improvements")}</h4>
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
