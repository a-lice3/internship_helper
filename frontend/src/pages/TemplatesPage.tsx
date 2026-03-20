import { useEffect, useState, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as api from "../api";

export default function TemplatesPage({ userId }: { userId: number }) {
  const { t } = useTranslation();

  const [templates, setTemplates] = useState<api.Template[]>([]);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    api.getTemplates(userId).then(setTemplates);
  }, [userId]);

  const handleAddText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    const tpl = await api.createTemplate(userId, { name, content });
    setTemplates([...templates, tpl]);
    setName("");
    setContent("");
  };

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/users/${userId}/templates/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.detail || t("templatesPage.uploadFailed"));
      return;
    }
    const tpl: api.Template = await res.json();
    setTemplates([...templates, tpl]);
    e.target.value = "";
  };

  const handleDelete = async (id: number) => {
    await api.deleteTemplate(userId, id);
    setTemplates(templates.filter((t) => t.id !== id));
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>{t("templatesPage.title")}</h2>
        <p className="page-desc">{t("templatesPage.description")}</p>
      </div>

      <nav className="pill-nav">
        <NavLink to="/profile" end className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("profile.profil")}</NavLink>
        <NavLink to="/profile/cvs" className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("profile.cvs")}</NavLink>
        <NavLink to="/profile/templates" className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("profile.templates")}</NavLink>
      </nav>

      <div className="bento-grid-2" style={{ marginBottom: 24 }}>
        <div className="glass-card">
          <div className="glass-card-header"><h3>{t("templatesPage.addFromText")}</h3></div>
          <div className="glass-card-body">
            <form onSubmit={handleAddText} className="form-vertical">
              <input placeholder={t("templatesPage.templateName")} value={name} onChange={(e) => setName(e.target.value)} />
              <textarea
                placeholder={t("templatesPage.placeholder")}
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <button type="submit">{t("templatesPage.addTemplate")}</button>
            </form>
          </div>
        </div>

        <div className="glass-card">
          <div className="glass-card-header"><h3>{t("templatesPage.uploadPDF")}</h3></div>
          <div className="glass-card-body">
            <p className="hint" style={{ marginBottom: 12 }}>{t("templatesPage.pdfHint")}</p>
            <input type="file" accept=".pdf" onChange={handleUploadPdf} />
          </div>
        </div>
      </div>

      {templates.length === 0 ? (
        <p className="empty">{t("templatesPage.noTemplates")}</p>
      ) : (
        <div className="card-list">
          {templates.map((t) => (
            <TemplateAccordion
              key={t.id}
              name={t.name}
              content={t.content}
              isPdf={!!t.file_path}
              createdAt={t.created_at}
              onDelete={() => handleDelete(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateAccordion({
  name, content, isPdf, createdAt, onDelete,
}: {
  name: string; content: string; isPdf: boolean; createdAt: string | null; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <div className="glass-card" style={{ marginBottom: 8 }}>
      <div className="glass-card-header accordion-header" onClick={toggle}>
        <span className="accordion-chevron">{open ? "\u25BC" : "\u25B6"}</span>
        <strong style={{ flex: 1 }}>{name}</strong>
        {isPdf && <span className="tag">PDF</span>}
        {createdAt && <span className="hint" style={{ marginLeft: "auto" }}>{new Date(createdAt).toLocaleDateString()}</span>}
        <button className="btn-delete" onClick={(e) => { e.stopPropagation(); onDelete(); }}>x</button>
      </div>
      {open && <pre className="card-body">{content}</pre>}
    </div>
  );
}
