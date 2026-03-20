import { useEffect, useState, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { saveAs } from "file-saver";
import * as api from "../api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function CVsPage({ userId }: { userId: number }) {
  const { t } = useTranslation();

  const [cvs, setCvs] = useState<api.CV[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [cvName, setCvName] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  const [editingCV, setEditingCV] = useState<api.CV | null>(null);
  const [editedLatex, setEditedLatex] = useState("");
  const [saving, setSaving] = useState(false);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [compileError, setCompileError] = useState("");

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { api.getCVs(userId).then(setCvs); }, [userId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [pdfUrl]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const cv = await api.uploadCVFile(userId, file, cvName || file.name, company, jobTitle);
      setCvs([cv, ...cvs]);
      setFile(null); setCvName(""); setCompany(""); setJobTitle("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("cvsPage.uploadFailed"));
    } finally { setUploading(false); }
  };

  const handleDelete = async (id: number) => {
    await api.deleteCV(userId, id);
    setCvs(cvs.filter((c) => c.id !== id));
    if (editingCV?.id === id) closeEditor();
  };

  const openEditor = (cv: api.CV) => {
    setEditingCV(cv);
    setEditedLatex(cv.latex_content || "");
    setChatMessages([]); setChatInput("");
    setPdfUrl(null); setCompileError("");
  };

  const closeEditor = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setEditingCV(null); setEditedLatex("");
    setChatMessages([]); setChatInput("");
    setPdfUrl(null); setCompileError("");
  };

  const handleSaveLatex = async () => {
    if (!editingCV) return;
    setSaving(true);
    try {
      const updated = await api.updateCV(userId, editingCV.id, { latex_content: editedLatex });
      setCvs(cvs.map((c) => (c.id === updated.id ? updated : c)));
      setEditingCV(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("cvsPage.saveFailed"));
    } finally { setSaving(false); }
  };

  const handleRefreshPdf = async () => {
    if (!editingCV) return;
    setCompiling(true); setCompileError("");
    try {
      await api.updateCV(userId, editingCV.id, { latex_content: editedLatex });
      const blob = await api.compileCVPdf(userId, editingCV.id);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(blob));
    } catch (err: unknown) {
      setCompileError(err instanceof Error ? err.message : t("cvsPage.compileFailed"));
    } finally { setCompiling(false); }
  };

  const handleDownloadPdf = () => {
    if (!pdfUrl || !editingCV) return;
    saveAs(pdfUrl, `${editingCV.name}.pdf`);
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !editingCV || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: userMsg }];
    setChatMessages(newMessages);
    setChatLoading(true);
    try {
      const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));
      const result = await api.chatEditCV(userId, editingCV.id, userMsg, history.length > 0 ? history : undefined);
      setEditedLatex(result.updated_latex);
      const updatedCV = { ...editingCV, latex_content: result.updated_latex };
      setEditingCV(updatedCV);
      setCvs(cvs.map((c) => (c.id === updatedCV.id ? updatedCV : c)));
      setChatMessages([...newMessages, { role: "assistant", content: "Done! The LaTeX has been updated." }]);
    } catch (err: unknown) {
      setChatMessages([...newMessages, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}` }]);
    } finally { setChatLoading(false); }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
  };

  // Editor view
  if (editingCV) {
    return (
      <div className="cv-editor-page">
        <div className="cv-editor-header">
          <button onClick={closeEditor} className="btn-cancel">&larr; {t("cvsPage.back")}</button>
          <h2>{editingCV.name}</h2>
          <div className="cv-editor-actions">
            <button onClick={handleSaveLatex} disabled={saving} className="btn-save">
              {saving ? t("cvsPage.saving") : t("cvsPage.save")}
            </button>
            <button onClick={handleRefreshPdf} disabled={compiling} className="btn-download">
              {compiling ? t("cvsPage.compiling") : t("cvsPage.refreshPDF")}
            </button>
            {pdfUrl && <button onClick={handleDownloadPdf} className="btn-download">{t("cvsPage.downloadPDF")}</button>}
          </div>
        </div>

        <div className="cv-editor-body">
          <div className="cv-editor-top">
            <div className="cv-editor-left">
              <div className="cv-editor-label">{t("cvsPage.latexSource")}</div>
              <textarea className="cv-latex-textarea" value={editedLatex} onChange={(e) => setEditedLatex(e.target.value)} spellCheck={false} />
            </div>
            <div className="cv-pdf-panel">
              <div className="cv-editor-label cv-pdf-label-bar">
                <span>{t("cvsPage.pdfPreview")}</span>
                <button onClick={handleRefreshPdf} disabled={compiling} className="cv-pdf-refresh-btn" title="Compile & refresh">
                  {compiling ? "..." : "\u21BB"}
                </button>
              </div>
              <div className="cv-pdf-viewer">
                {compileError && <p className="error" style={{ padding: 12 }}>{compileError}</p>}
                {!pdfUrl && !compileError && !compiling && (
                  <div className="cv-pdf-placeholder"><p dangerouslySetInnerHTML={{ __html: t("cvsPage.clickRefresh") }} /></div>
                )}
                {compiling && !pdfUrl && (
                  <div className="cv-pdf-placeholder"><p>{t("cvsPage.compiling")}</p></div>
                )}
                {pdfUrl && <iframe src={pdfUrl} className="cv-pdf-iframe" title="PDF Preview" />}
              </div>
            </div>
          </div>

          <div className="cv-chat-bottom">
            <div className="cv-chat-messages cv-chat-messages-vertical">
              {chatMessages.length === 0 && (
                <div className="cv-chat-welcome">
                  <span>{t("cvsPage.askAI")}</span>
                  <span className="hint">{t("cvsPage.askAIHint")}</span>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`cv-chat-msg cv-chat-msg-${msg.role}`}>
                  <span className="cv-chat-msg-role">{msg.role === "user" ? t("cvsPage.you") : t("cvsPage.ai")}</span>
                  <span className="cv-chat-msg-text">{msg.content}</span>
                </div>
              ))}
              {chatLoading && (
                <div className="cv-chat-msg cv-chat-msg-assistant">
                  <span className="cv-chat-msg-role">{t("cvsPage.ai")}</span>
                  <span className="cv-chat-msg-text cv-chat-typing">{t("cvsPage.editing")}</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="cv-chat-input-row">
              <textarea className="cv-chat-input" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleChatKeyDown} placeholder={t("cvsPage.describeChange")} rows={1} />
              <button onClick={handleChatSend} disabled={!chatInput.trim() || chatLoading} className="cv-chat-send">{t("cvsPage.send")}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CV list view
  return (
    <div className="page">
      <div className="page-header">
        <h2>{t("cvsPage.title")}</h2>
        <p className="page-desc">{t("cvsPage.description")}</p>
      </div>

      <nav className="pill-nav">
        <NavLink to="/profile" end className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("profile.profil")}</NavLink>
        <NavLink to="/profile/cvs" className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("profile.cvs")}</NavLink>
        <NavLink to="/profile/templates" className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("profile.templates")}</NavLink>
      </nav>

      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div className="glass-card-body">
          <form onSubmit={handleUpload} className="form-grid">
            <label>
              {t("cvsPage.file")}
              <input type="file" accept=".pdf,.tex,.zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <label>
              {t("cvsPage.cvName")}
              <input placeholder={t("cvsPage.cvNamePlaceholder")} value={cvName} onChange={(e) => setCvName(e.target.value)} />
            </label>
            <label>
              {t("cvsPage.company")}
              <input placeholder={t("cvsPage.companyPlaceholder")} value={company} onChange={(e) => setCompany(e.target.value)} />
            </label>
            <label>
              {t("cvsPage.jobTitle")}
              <input placeholder={t("cvsPage.jobTitlePlaceholder")} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </label>
            <button type="submit" disabled={!file || uploading}>
              {uploading ? t("cvsPage.uploading") : t("cvsPage.uploadCV")}
            </button>
          </form>
        </div>
      </div>

      {cvs.length === 0 ? (
        <p className="empty">{t("cvsPage.noCVs")}</p>
      ) : (
        <div className="card-list">
          {cvs.map((cv) => (
            <div key={cv.id} className="glass-card" style={{ padding: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong style={{ color: "var(--text-h)", fontSize: 14 }}>{cv.name}</strong>
                    {cv.latex_content ? (
                      <span className="tag">LaTeX</span>
                    ) : cv.file_path ? (
                      <span className="tag">PDF</span>
                    ) : cv.is_adapted ? (
                      <span className="tag tag-ai">AI-adapted</span>
                    ) : (
                      <span className="tag">Text</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 12 }}>
                    {cv.company && <span>{cv.company}</span>}
                    {cv.job_title && <span>{cv.job_title}</span>}
                    {cv.created_at && <span>{new Date(cv.created_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="actions-row">
                  {cv.latex_content && <button onClick={() => openEditor(cv)} className="btn-ghost">{t("cvsPage.edit")}</button>}
                  {cv.file_path && <a href={api.downloadCVUrl(userId, cv.id)} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>{t("cvsPage.download")}</a>}
                  {cv.latex_content && (
                    <a
                      href="#"
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const res = await fetch(api.compileCVUrl(userId, cv.id), { method: "POST" });
                          if (!res.ok) { const body = await res.json().catch(() => ({})); alert(body.detail || t("cvsPage.compileFailed")); return; }
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url; a.download = `${cv.name}.pdf`; a.click();
                          URL.revokeObjectURL(url);
                        } catch { alert(t("cvsPage.compileFailed")); }
                      }}
                      style={{ fontSize: 12 }}
                    >
                      {t("cvsPage.compilePDF")}
                    </a>
                  )}
                  <button onClick={() => handleDelete(cv.id)} className="btn-icon" title="Delete">x</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
