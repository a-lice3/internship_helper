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

  // Company info (Wikipedia)
  const [companyInfo, setCompanyInfo] = useState<api.CompanyInfo | null>(null);

  // Cover letter
  const [savedCoverLetters, setSavedCoverLetters] = useState<api.StoredCoverLetter[]>([]);
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState<number | "">("");
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
  const [savingLatex, setSavingLatex] = useState(false);
  const [latexSaved, setLatexSaved] = useState(false);
  const [cvSuggestions, setCvSuggestions] = useState<api.CVSuggestionsResult | null>(null);

  // Editing offer
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    company: "", title: "", link: "", locations: "", description: "", status: "bookmarked", date_applied: "",
  });

  // Auto-generate on first visit
  const [autoGenerating, setAutoGenerating] = useState(false);

  // CV upload modal
  const [showCVUpload, setShowCVUpload] = useState(false);
  const [cvUploadFile, setCvUploadFile] = useState<File | null>(null);
  const [cvUploadName, setCvUploadName] = useState("");
  const [cvUploading, setCvUploading] = useState(false);
  const cvFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      api.getOffer(userId, id),
      api.getOfferNotes(userId, id),
      api.getSavedCoverLetters(userId),
      api.getCVs(userId),
      api.getReminders(userId, true),
      api.getStoredSkillGaps(userId),
      api.getStoredCoverLetters(userId),
      api.getStoredCVOfferAnalyses(userId),
    ]).then(([o, n, scls, c, r, sgs, cls, coas]) => {
      if (cancelled) return;
      setOffer(o);
      setNotes(n);
      setSavedCoverLetters(scls);

      // Fetch company info from Wikipedia (non-blocking)
      api.getCompanyInfo(o.company).then((info) => {
        if (!cancelled && info.extract) setCompanyInfo(info);
      }).catch(() => {});
      setCvs(c);
      setReminders(r.filter((rem: api.Reminder) => rem.offer_id === id));

      // Auto-select default CV
      const defaultCV = c.find((cv: api.CV) => cv.is_default);
      if (defaultCV) setSelectedCV(defaultCV.id);

      // Find existing generations for this offer
      const existingSG = sgs.find((sg: api.StoredSkillGap) => sg.offer_id === id) || null;
      const existingCL = cls.find((cl: api.StoredCoverLetter) => cl.offer_id === id) || null;
      setStoredSkillGap(existingSG);
      setStoredCoverLetter(existingCL);

      // Restore the most recent CV offer analysis for this offer
      const offerCOAs = (coas as api.StoredCVOfferAnalysis[])
        .filter((a) => a.offer_id === id)
        .sort((a, b) => {
          const da = a.created_at ? new Date(a.created_at).getTime() : 0;
          const db = b.created_at ? new Date(b.created_at).getTime() : 0;
          return db - da;
        });
      const latestCOA = offerCOAs[0] || null;
      if (latestCOA) {
        setCvSuggestions({
          id: latestCOA.id,
          cv_id: latestCOA.cv_id,
          score: latestCOA.score,
          suggested_title: latestCOA.suggested_title,
          suggested_profile: latestCOA.suggested_profile,
          other_suggestions: latestCOA.other_suggestions,
          offer_title: latestCOA.offer_title,
          company: latestCOA.company,
        });
        // Select the CV that was last analyzed
        const lastAnalyzedCV = c.find((cv: api.CV) => cv.id === latestCOA.cv_id);
        if (lastAnalyzedCV) setSelectedCV(lastAnalyzedCV.id);
      }
      if (existingCL) setEditableCoverLetter(existingCL.content);

      // Auto-generate on first visit only (when skill gap & cover letter don't exist yet)
      const needsSG = !existingSG;
      const needsCL = !existingCL;
      const existingDefaultCOA = defaultCV
        ? (coas as api.StoredCVOfferAnalysis[]).find((a) => a.offer_id === id && a.cv_id === defaultCV.id)
        : null;
      const needsCV = !!(defaultCV && !existingDefaultCOA);
      if (needsSG || needsCL) {
        setAutoGenerating(true);
        const sgTask = needsSG ? api.analyzeSkillGap(userId, id) : Promise.resolve(null);
        const clTask = needsCL ? api.generateCoverLetter(userId, id) : Promise.resolve(null);
        Promise.allSettled([sgTask, clTask]).then((results) => {
          if (cancelled) return;
          const [sgResult, clResult] = results;
          if (needsSG && sgResult.status === "fulfilled" && sgResult.value) {
            const sg = sgResult.value as api.SkillGapResult;
            setStoredSkillGap({ id: sg.id, offer_id: id, offer_title: sg.offer_title, company: sg.company, missing_hard_skills: sg.missing_hard_skills, missing_soft_skills: sg.missing_soft_skills, recommendations: sg.recommendations, created_at: null });
            setSkillGap(sg);
          }
          if (needsCL && clResult.status === "fulfilled" && clResult.value) {
            const cl = clResult.value as api.CoverLetterResult;
            setStoredCoverLetter({ id: cl.id, offer_id: id, template_id: null, name: null, offer_title: cl.offer_title, company: cl.company, content: cl.cover_letter, saved: false, created_at: null });
            setCoverLetter(cl);
            setEditableCoverLetter(cl.cover_letter);
          }
          if (!needsCV) setAutoGenerating(false);
        });
      }
      // Auto-analyze default CV for this offer (independent of skill gap / cover letter)
      if (needsCV && defaultCV) {
        if (!needsSG && !needsCL) setAutoGenerating(true);
        const cvPromise = defaultCV.latex_content
          ? Promise.all([
              api.suggestCVChanges(userId, id, defaultCV.id),
              api.adaptCVLatex(userId, id, defaultCV.id),
            ]).then(([suggestions, adapted]) => {
              if (cancelled) return;
              setCvSuggestions(suggestions);
              setLatexResult(adapted);
            })
          : api.suggestCVChanges(userId, id, defaultCV.id).then((result) => {
              if (cancelled) return;
              setCvSuggestions(result);
            });
        cvPromise.catch(() => {}).finally(() => {
          if (!cancelled) setAutoGenerating(false);
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
  const handleCoverLetter = async (coverLetterId?: number) => {
    setAiLoading(true); setAiError(""); setCoverLetter(null);
    try {
      const result = await api.generateCoverLetter(userId, id, coverLetterId ? { coverLetterId } : undefined);
      setCoverLetter(result);
      setStoredCoverLetter({ id: result.id, offer_id: id, template_id: null, name: null, offer_title: result.offer_title, company: result.company, content: result.cover_letter, saved: false, created_at: null });
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
      await api.updateCoverLetter(userId, storedCoverLetter.id, { content: editableCoverLetter });
      setStoredCoverLetter({ ...storedCoverLetter, content: editableCoverLetter });
      setCoverLetter((prev) => prev ? { ...prev, cover_letter: editableCoverLetter } : prev);
      setClEdited(false);
    } catch (e: unknown) { setAiError(e instanceof Error ? e.message : "Unknown error"); }
    setClSaving(false);
  };

  // Cover letter: toggle saved flag (add to / remove from Cover Letters page)
  const handleToggleSavedCoverLetter = async () => {
    if (!storedCoverLetter) return;
    const newSaved = !storedCoverLetter.saved;
    try {
      // Also persist content edits if any
      const data: { saved: boolean; content?: string } = { saved: newSaved };
      if (clEdited) data.content = editableCoverLetter;
      await api.updateCoverLetter(userId, storedCoverLetter.id, data);
      setStoredCoverLetter({ ...storedCoverLetter, saved: newSaved, ...(clEdited ? { content: editableCoverLetter } : {}) });
      if (clEdited) {
        setCoverLetter((prev) => prev ? { ...prev, cover_letter: editableCoverLetter } : prev);
        setClEdited(false);
      }
    } catch (e: unknown) { setAiError(e instanceof Error ? e.message : "Unknown error"); }
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
  const handleCVUpload = async () => {
    if (!cvUploadFile) return;
    setCvUploading(true);
    try {
      const cv = await api.uploadCVFile(userId, cvUploadFile, cvUploadName || cvUploadFile.name, offer?.company || "", offer?.title || "");
      setCvs((prev) => [cv, ...prev]);
      setSelectedCV(cv.id);
      setShowCVUpload(false);
      setCvUploadFile(null);
      setCvUploadName("");
      // Trigger general analysis in background (displayed only in CVs page)
      api.analyzeCVGeneral(userId, cv.id).catch(() => {});
      // Trigger offer-specific CV analysis immediately
      runCVAnalysis(cv);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("cvsPage.uploadFailed"));
    } finally {
      setCvUploading(false);
    }
  };

  const runCVAnalysis = async (cv: api.CV) => {
    setAiLoading(true); setAiError(""); setLatexResult(null); setCvSuggestions(null); setLatexSaved(false);
    try {
      if (cv.latex_content) {
        // For LaTeX CVs: get suggestions (same as PDF) + adapted LaTeX in parallel
        const [suggestions, adapted] = await Promise.all([
          api.suggestCVChanges(userId, id, cv.id),
          api.adaptCVLatex(userId, id, cv.id),
        ]);
        setCvSuggestions(suggestions);
        setLatexResult(adapted);
        setEditedLatex(adapted.adapted_latex);
      } else {
        const result = await api.suggestCVChanges(userId, id, cv.id);
        setCvSuggestions(result);
      }
    } catch (e: unknown) { setAiError(e instanceof Error ? e.message : "Unknown error"); }
    setAiLoading(false);
  };

  const handleAdaptCV = async () => {
    if (!selectedCV) return;
    const cv = cvs.find((c) => c.id === Number(selectedCV));
    if (!cv) return;
    await runCVAnalysis(cv);
  };

  const handleCVSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : "";
    setSelectedCV(val);
    setLatexResult(null);
    setCvSuggestions(null);
    if (val) {
      const cv = cvs.find((c) => c.id === val);
      if (cv) runCVAnalysis(cv);
    }
  };

  const handleSaveAdaptedCV = async () => {
    if (!latexResult || !offer) return;
    setSavingLatex(true); setAiError(""); setLatexSaved(false);
    try {
      const saved = await api.saveCVWithLatex(userId, {
        name: `CV adapted - ${offer.company}`,
        content: "(LaTeX CV)",
        latex_content: latexResult.adapted_latex,
        support_files_dir: latexResult.support_files_dir,
        company: offer.company, job_title: offer.title, offer_id: id,
      });
      setCvs((prev) => [saved, ...prev]);
      setLatexSaved(true);
    } catch (e: unknown) { setAiError(e instanceof Error ? e.message : "Save failed"); }
    setSavingLatex(false);
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
      {companyInfo && (companyInfo.extract || companyInfo.page_url) && (
        <div className="glass-card" style={{ marginTop: 20 }}>
          <div className="glass-card-header">
            <h3 style={{ margin: 0 }}>{t("offerDetail.about", { company: offer.company })}</h3>
          </div>
          <div className="glass-card-body" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {companyInfo.logo_url && (
              <img src={companyInfo.logo_url} alt={offer.company} style={{ width: 60, height: 60, objectFit: "contain", borderRadius: 8, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              {companyInfo.description && companyInfo.extract && (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, fontStyle: "italic" }}>{companyInfo.description}</div>
              )}
              {companyInfo.extract ? (
                <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>{companyInfo.extract}</p>
              ) : (
                <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5, color: "var(--text-muted)" }}>
                  {t("offerDetail.about", { company: offer.company })}
                </p>
              )}
              {companyInfo.page_url && (
                <a href={companyInfo.page_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, marginTop: 6, display: "inline-block" }}>
                  {companyInfo.extract ? t("offerDetail.wikipedia") : t("offerDetail.searchOnline")}
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
              {aiLoading ? t("offerDetail.generating") : t("offerDetail.regenerate")}
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
              value={selectedCoverLetterId}
              onChange={(e) => setSelectedCoverLetterId(e.target.value ? Number(e.target.value) : "")}
              style={{ width: "auto", fontSize: 11, padding: "2px 6px" }}
            >
              <option value="">{t("offerDetail.noTemplate")}</option>
              {savedCoverLetters.map((cl) => <option key={cl.id} value={cl.id}>{cl.name || cl.offer_title || `#${cl.id}`}</option>)}
            </select>
            <button
              className="btn-ghost"
              onClick={() => handleCoverLetter(selectedCoverLetterId ? Number(selectedCoverLetterId) : undefined)}
              disabled={aiLoading}
              style={{ fontSize: 12, padding: "2px 8px" }}
            >
              {aiLoading ? t("offerDetail.generating") : t("offerDetail.regenerate")}
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
                  <button onClick={handleToggleSavedCoverLetter} className={storedCoverLetter?.saved ? "btn-ghost" : "btn-secondary"} style={{ fontSize: 12 }}>
                    {storedCoverLetter?.saved ? t("offerDetail.savedToCoverLetters") : t("offerDetail.saveToCoverLetters")}
                  </button>
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

      {/* Row 2b: CV Analysis — full width */}
      <div className="glass-card" style={{ marginTop: 16 }}>
        <div className="glass-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>{t("offerDetail.cvAnalysis")}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {cvs.length > 0 && (
              <>
                <select value={selectedCV} onChange={handleCVSelectChange} style={{ width: "auto", fontSize: 11, padding: "2px 6px" }}>
                  {cvs.map((c) => <option key={c.id} value={c.id}>{c.name} {c.is_default ? "\u2605" : ""}</option>)}
                </select>
                <button
                  className="btn-ghost"
                  onClick={handleAdaptCV}
                  disabled={!selectedCV || aiLoading}
                  style={{ fontSize: 12, padding: "2px 8px" }}
                >
                  {aiLoading ? t("offerDetail.adapting") : t("offerDetail.regenerate")}
                </button>
              </>
            )}
            <button
              className="btn-ghost"
              onClick={() => setShowCVUpload(true)}
              title={t("offerDetail.uploadNewCV")}
              style={{ fontSize: 16, padding: "0 6px", lineHeight: 1 }}
            >
              +
            </button>
          </div>
        </div>
        <div className="glass-card-body">
          {cvs.length === 0 ? (
            <p className="empty" style={{ margin: 0, fontSize: 13 }}>{t("offerDetail.uploadCVPrompt")}</p>
          ) : cvSuggestions ? (
            <div style={{ fontSize: 13 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <strong>{t("offerDetail.cvScore")} {cvSuggestions.score}/10</strong>
              </div>
              {cvSuggestions.suggested_title && (
                <div style={{ marginBottom: 10, padding: "8px 12px", background: "var(--surface-solid)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <strong>{t("offerDetail.suggestedTitle")}</strong>
                  <p style={{ margin: "4px 0 0" }}>{cvSuggestions.suggested_title}</p>
                </div>
              )}
              {cvSuggestions.suggested_profile && (
                <div style={{ marginBottom: 10, padding: "8px 12px", background: "var(--surface-solid)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <strong>{t("offerDetail.suggestedProfile")}</strong>
                  <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{cvSuggestions.suggested_profile}</p>
                </div>
              )}
              {cvSuggestions.other_suggestions.length > 0 && (
                <div style={{ padding: "8px 12px", background: "var(--surface-solid)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <strong>{t("offerDetail.otherSuggestions")}</strong>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                    {cvSuggestions.other_suggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {latexResult && (
                <div style={{ marginTop: 12 }}>
                  <button onClick={handleSaveAdaptedCV} disabled={savingLatex || latexSaved} className="btn-primary" style={{ boxShadow: "none", fontSize: 12 }}>
                    {savingLatex ? t("offerDetail.saving") : latexSaved ? "✓ Saved!" : t("offerDetail.saveToCV")}
                  </button>
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

      {/* Row 3: Notes + Reminders side by side */}
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

          {aiError && <p className="error" style={{ marginTop: 12 }}>{aiError}</p>}
        </div>
      </div>

      {/* CV Upload Modal */}
      {showCVUpload && (
        <div className="modal-overlay" onClick={() => { setShowCVUpload(false); setCvUploadFile(null); setCvUploadName(""); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{t("offerDetail.uploadNewCV")}</h3>
              <button className="btn-icon" onClick={() => { setShowCVUpload(false); setCvUploadFile(null); setCvUploadName(""); }}>&times;</button>
            </div>
            <input
              ref={cvFileInputRef}
              type="file"
              accept=".pdf,.tex,.zip"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setCvUploadFile(f); if (cvFileInputRef.current) cvFileInputRef.current.value = ""; }}
              style={{ display: "none" }}
            />
            {!cvUploadFile ? (
              <div
                onClick={() => cvFileInputRef.current?.click()}
                style={{ border: "2px dashed var(--border)", borderRadius: 10, padding: "32px 16px", textAlign: "center", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <p style={{ margin: "0 0 4px", fontSize: 14 }}>{t("cvsPage.dropzoneTitle")}</p>
                <p style={{ margin: 0, fontSize: 12 }}>{t("cvsPage.acceptedFormats")}</p>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 12px", background: "var(--surface-solid)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <span style={{ fontWeight: 600, fontSize: 12, color: "var(--accent)" }}>
                    {cvUploadFile.name.endsWith(".pdf") ? "PDF" : cvUploadFile.name.endsWith(".tex") ? "TEX" : "ZIP"}
                  </span>
                  <span style={{ flex: 1, fontSize: 13 }}>{cvUploadFile.name}</span>
                  <button className="btn-icon" onClick={() => setCvUploadFile(null)} style={{ fontSize: 14 }}>&times;</button>
                </div>
                <label style={{ display: "block", marginBottom: 12, fontSize: 13 }}>
                  {t("cvsPage.cvName")}
                  <input
                    value={cvUploadName}
                    onChange={(e) => setCvUploadName(e.target.value)}
                    placeholder={t("cvsPage.cvNamePlaceholder")}
                    style={{ width: "100%", marginTop: 4 }}
                  />
                </label>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn-cancel" onClick={() => { setShowCVUpload(false); setCvUploadFile(null); setCvUploadName(""); }}>{t("offerDetail.cancel")}</button>
                  <button className="btn-primary" onClick={handleCVUpload} disabled={cvUploading} style={{ boxShadow: "none" }}>
                    {cvUploading ? t("cvsPage.uploading") : t("cvsPage.uploadCV")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
