import { useEffect, useState, useRef, useCallback } from "react";
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
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const [editingCV, setEditingCV] = useState<api.CV | null>(null);
  const [editedLatex, setEditedLatex] = useState("");

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [compileError, setCompileError] = useState("");

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [previewCvId, setPreviewCvId] = useState<number | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  useEffect(() => { api.getCVs(userId).then(setCvs); }, [userId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [pdfUrl]);

  const acceptFile = useCallback((f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf" || ext === "tex" || ext === "zip") {
      setFile(f);
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current++;
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) acceptFile(droppedFile);
  }, [acceptFile]);

  const handleBrowse = () => fileInputRef.current?.click();

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = () => setFile(null);

  const handleDownloadCV = async (cv: api.CV) => {
    try {
      const blob = await api.downloadCVBlob(userId, cv.id);
      saveAs(blob, cv.name.endsWith(".pdf") ? cv.name : `${cv.name}.pdf`);
    } catch {
      alert(t("cvsPage.uploadFailed"));
    }
  };

  const togglePreview = async (cv: api.CV) => {
    if (previewCvId === cv.id) {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
      setPreviewCvId(null);
      setPreviewBlobUrl(null);
      return;
    }
    try {
      const blob = await api.downloadCVBlob(userId, cv.id);
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
      // Force application/pdf MIME type so the browser renders inline
      const pdfBlob = new Blob([blob], { type: "application/pdf" });
      const url = URL.createObjectURL(pdfBlob);
      setPreviewBlobUrl(url);
      setPreviewCvId(cv.id);
    } catch {
      alert(t("cvsPage.uploadFailed"));
    }
  };

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
              <textarea className="cv-chat-input" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleChatKeyDown} placeholder={t("cvsPage.chatPlaceholder")} rows={1} />
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
        <NavLink to="/profile/cover-letters" className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("profile.coverLetters")}</NavLink>
      </nav>

      <form onSubmit={handleUpload}>
        <div
          className={`cv-dropzone${dragging ? " cv-dropzone-active" : ""}${file ? " cv-dropzone-has-file" : ""}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={!file ? handleBrowse : undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.tex,.zip"
            onChange={handleFileInputChange}
            style={{ display: "none" }}
          />

          {!file ? (
            <div className="cv-dropzone-content">
              <div className="cv-dropzone-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect x="4" y="8" width="40" height="32" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
                  <path d="M24 18v12M18 24h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <p className="cv-dropzone-title">{t("cvsPage.dropzoneTitle")}</p>
              <p className="cv-dropzone-hint">{t("cvsPage.dropzoneHint")}</p>
              <button type="button" className="btn-secondary cv-dropzone-browse" onClick={(e) => { e.stopPropagation(); handleBrowse(); }}>
                {t("cvsPage.browseFiles")}
              </button>
              <p className="cv-dropzone-formats">{t("cvsPage.acceptedFormats")}</p>
            </div>
          ) : (
            <div className="cv-dropzone-selected" onClick={(e) => e.stopPropagation()}>
              <div className="cv-dropzone-file-info">
                <span className="cv-dropzone-file-icon">
                  {file.name.endsWith(".pdf") ? "PDF" : file.name.endsWith(".tex") ? "TEX" : "ZIP"}
                </span>
                <div>
                  <p className="cv-dropzone-file-name">{file.name}</p>
                  <p className="cv-dropzone-file-size">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button type="button" className="btn-icon" onClick={handleRemoveFile} title={t("common.delete")}>&times;</button>
              </div>

              <div className="cv-dropzone-meta">
                <label>
                  {t("cvsPage.cvName")}
                  <input placeholder={t("cvsPage.cvNamePlaceholder")} value={cvName} onChange={(e) => setCvName(e.target.value)} />
                </label>
                <div className="form-row">
                  <label style={{ flex: 1 }}>
                    {t("cvsPage.company")}
                    <input placeholder={t("cvsPage.companyPlaceholder")} value={company} onChange={(e) => setCompany(e.target.value)} />
                  </label>
                  <label style={{ flex: 1 }}>
                    {t("cvsPage.jobTitle")}
                    <input placeholder={t("cvsPage.jobTitlePlaceholder")} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                  </label>
                </div>
              </div>

              <button type="submit" disabled={uploading} style={{ alignSelf: "flex-end" }}>
                {uploading ? t("cvsPage.uploading") : t("cvsPage.uploadCV")}
              </button>
            </div>
          )}
        </div>
      </form>

      {cvs.length === 0 ? (
        <p className="empty">{t("cvsPage.noCVs")}</p>
      ) : (
        <div className="card-list">
          {cvs.map((cv) => (
            <div key={cv.id}>
              <div
                className={`glass-card cv-card-clickable${previewCvId === cv.id ? " cv-card-expanded" : ""}`}
                style={{ padding: 0, cursor: "pointer" }}
                onClick={() => {
                  if (cv.latex_content) {
                    openEditor(cv);
                  } else if (cv.file_path) {
                    togglePreview(cv);
                  }
                }}
              >
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
                      {cv.file_path && (
                        <button
                          className="cv-download-icon"
                          title={t("cvsPage.download")}
                          onClick={(e) => { e.stopPropagation(); handleDownloadCV(cv); }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 12 }}>
                      {cv.company && <span>{cv.company}</span>}
                      {cv.job_title && <span>{cv.job_title}</span>}
                      {cv.created_at && <span>{new Date(cv.created_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="actions-row" onClick={(e) => e.stopPropagation()}>
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
              {previewCvId === cv.id && previewBlobUrl && (
                <div className="cv-preview-panel">
                  <object
                    data={previewBlobUrl}
                    type="application/pdf"
                    className="cv-preview-iframe"
                    aria-label={`Preview ${cv.name}`}
                  >
                    <p style={{ padding: 16, color: "var(--text-muted)" }}>{t("cvsPage.download")}</p>
                  </object>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
