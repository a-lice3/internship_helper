import { useEffect, useState } from "react";
import * as api from "../api";

export default function TemplatesPage({ userId }: { userId: number }) {
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

  // Upload PDF : on envoie en multipart/form-data (pas du JSON)
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
      alert(err.detail || "Upload failed");
      return;
    }
    const tpl: api.Template = await res.json();
    setTemplates([...templates, tpl]);
    e.target.value = ""; // reset file input
  };

  const handleDelete = async (id: number) => {
    await api.deleteTemplate(userId, id);
    setTemplates(templates.filter((t) => t.id !== id));
  };

  return (
    <div className="page">
      <h2>Cover Letter Templates</h2>

      <div className="two-col">
        <form onSubmit={handleAddText} className="form-vertical">
          <h3>Add from text</h3>
          <input placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea
            placeholder="Dear hiring manager, ..."
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button type="submit">Add template</button>
        </form>

        <div className="form-vertical">
          <h3>Upload PDF</h3>
          <p className="hint">The text will be extracted automatically for AI use.</p>
          <input type="file" accept=".pdf" onChange={handleUploadPdf} />
        </div>
      </div>

      {templates.length === 0 ? (
        <p className="empty">No templates yet.</p>
      ) : (
        <div className="card-list">
          {templates.map((t) => (
            <div key={t.id} className="card">
              <div className="card-header">
                <strong>{t.name}</strong>
                {t.file_path && <span className="tag">PDF</span>}
                <button className="btn-delete" onClick={() => handleDelete(t.id)}>x</button>
              </div>
              <pre className="card-body">{t.content}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
