import { useEffect, useState, useRef, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import * as api from "../api";

export default function TemplatesPage({ userId }: { userId: number }) {
  const { t } = useTranslation();

  const [coverLetters, setCoverLetters] = useState<api.StoredCoverLetter[]>([]);

  // Drag & drop
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    api.getSavedCoverLetters(userId).then(setCoverLetters);
  }, [userId]);

  // Drag & drop handlers
  const acceptFile = useCallback((f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") setFile(f);
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const cl = await api.uploadCoverLetterPdf(userId, file);
      setCoverLetters([cl, ...coverLetters]);
      setFile(null);
    } catch {
      alert(t("coverLettersPage.uploadFailed"));
    } finally { setUploading(false); }
  };

  const handleDelete = async (id: number) => {
    await api.deleteStoredCoverLetter(userId, id);
    setCoverLetters(coverLetters.filter((cl) => cl.id !== id));
  };

  const handleUnsave = async (cl: api.StoredCoverLetter) => {
    if (cl.offer_id) {
      // Generated from offer — just unsave, keep in DB
      await api.updateCoverLetter(userId, cl.id, { saved: false });
    } else {
      // Manually uploaded — delete entirely
      await api.deleteStoredCoverLetter(userId, cl.id);
    }
    setCoverLetters(coverLetters.filter((c) => c.id !== cl.id));
  };

  const downloadDocx = async (text: string, label: string) => {
    const paragraphs = text.split("\n").map((line) =>
      new Paragraph({ children: [new TextRun({ text: line, font: "Calibri", size: 24 })] })
    );
    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${label.replace(/\s+/g, "_")}.docx`);
  };

  const getLabel = (cl: api.StoredCoverLetter) => {
    if (cl.name) return cl.name;
    if (cl.company && cl.offer_title) return `${cl.company} — ${cl.offer_title}`;
    return `Cover Letter #${cl.id}`;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>{t("coverLettersPage.title")}</h2>
        <p className="page-desc">{t("coverLettersPage.description")}</p>
      </div>

      <nav className="pill-nav">
        <NavLink to="/profile" end className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("profile.profil")}</NavLink>
        <NavLink to="/profile/cvs" className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("profile.cvs")}</NavLink>
        <NavLink to="/profile/cover-letters" className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("profile.coverLetters")}</NavLink>
      </nav>

      {/* Upload via drag & drop */}
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
            accept=".pdf"
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
              <p className="cv-dropzone-title">{t("coverLettersPage.dropzoneTitle")}</p>
              <p className="cv-dropzone-hint">{t("coverLettersPage.dropzoneHint")}</p>
              <button type="button" className="btn-secondary cv-dropzone-browse" onClick={(e) => { e.stopPropagation(); handleBrowse(); }}>
                {t("cvsPage.browseFiles")}
              </button>
              <p className="cv-dropzone-formats">PDF</p>
            </div>
          ) : (
            <div className="cv-dropzone-selected" onClick={(e) => e.stopPropagation()}>
              <div className="cv-dropzone-file-info">
                <span className="cv-dropzone-file-icon">PDF</span>
                <div>
                  <p className="cv-dropzone-file-name">{file.name}</p>
                  <p className="cv-dropzone-file-size">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button type="button" className="btn-icon" onClick={handleRemoveFile} title={t("common.delete")}>&times;</button>
              </div>
              <button type="submit" disabled={uploading} style={{ alignSelf: "flex-end" }}>
                {uploading ? t("cvsPage.uploading") : t("coverLettersPage.upload")}
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Cover letters list */}
      {coverLetters.length === 0 ? (
        <p className="empty">{t("coverLettersPage.noCoverLetters")}</p>
      ) : (
        <div className="card-list">
          {coverLetters.map((cl) => (
            <CoverLetterCard
              key={cl.id}
              cl={cl}
              label={getLabel(cl)}
              onDownload={() => downloadDocx(cl.content, getLabel(cl))}
              onRemove={() => handleUnsave(cl)}
              onDelete={() => handleDelete(cl.id)}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CoverLetterCard({
  cl, label, onDownload, onRemove, onDelete, t,
}: {
  cl: api.StoredCoverLetter;
  label: string;
  onDownload: () => void;
  onRemove: () => void;
  onDelete: () => void;
  t: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card" style={{ marginBottom: 8 }}>
      <div
        className="glass-card-header accordion-header"
        onClick={() => setOpen(!open)}
        style={{ cursor: "pointer" }}
      >
        <span className="accordion-chevron">{open ? "\u25BC" : "\u25B6"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong style={{ color: "var(--text-h)", fontSize: 14 }}>{label}</strong>
            {cl.offer_id ? (
              <span className="tag tag-ai">AI</span>
            ) : (
              <span className="tag">PDF</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            {cl.created_at && new Date(cl.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="actions-row" onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={onDownload} className="cv-download-icon" title={t("coverLettersPage.downloadDocx")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <button onClick={cl.offer_id ? onRemove : onDelete} className="btn-icon" title={t("common.delete")}>x</button>
        </div>
      </div>
      {open && (
        <pre className="card-body" style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, padding: 16 }}>
          {cl.content}
        </pre>
      )}
    </div>
  );
}
