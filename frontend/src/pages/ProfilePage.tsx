import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as api from "../api";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card" style={{ marginBottom: 16 }}>
      <div className="glass-card-header"><h3>{title}</h3></div>
      <div className="glass-card-body">{children}</div>
    </div>
  );
}

export default function ProfilePage({ userId }: { userId: number }) {
  const { t } = useTranslation();

  const [skills, setSkills] = useState<api.Skill[]>([]);
  const [skillName, setSkillName] = useState("");
  const [skillCategory, setSkillCategory] = useState("programming");

  const [experiences, setExperiences] = useState<api.Experience[]>([]);
  const [expTitle, setExpTitle] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expTech, setExpTech] = useState("");
  const [expClient, setExpClient] = useState("");
  const [expStart, setExpStart] = useState("");
  const [expEnd, setExpEnd] = useState("");

  const [education, setEducation] = useState<api.Education[]>([]);
  const [eduSchool, setEduSchool] = useState("");
  const [eduDegree, setEduDegree] = useState("");
  const [eduField, setEduField] = useState("");
  const [eduDesc, setEduDesc] = useState("");
  const [eduStart, setEduStart] = useState("");
  const [eduEnd, setEduEnd] = useState("");

  const [languages, setLanguages] = useState<api.Language[]>([]);
  const [langName, setLangName] = useState("");
  const [langLevel, setLangLevel] = useState("intermediate");

  const [extras, setExtras] = useState<api.Extracurricular[]>([]);
  const [extraName, setExtraName] = useState("");
  const [extraDesc, setExtraDesc] = useState("");

  const [filling, setFilling] = useState(false);
  const [cvList, setCvList] = useState<api.CV[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<number | "">("");

  const [editing, setEditing] = useState<{ type: string; id: number } | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});

  const loadAll = () => {
    api.getSkills(userId).then(setSkills);
    api.getExperiences(userId).then(setExperiences);
    api.getEducation(userId).then(setEducation);
    api.getLanguages(userId).then(setLanguages);
    api.getExtracurriculars(userId).then(setExtras);
    api.getCVs(userId).then(setCvList);
  };

  useEffect(loadAll, [userId]);

  const startEdit = (type: string, id: number, data: Record<string, string>) => {
    setEditing({ type, id });
    setEditData(data);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditData({});
  };

  const isEditing = (type: string, id: number) =>
    editing?.type === type && editing?.id === id;

  const editField = (key: string) => editData[key] ?? "";
  const setEditField = (key: string, value: string) =>
    setEditData((prev) => ({ ...prev, [key]: value }));

  const handleClearProfile = async () => {
    await api.clearProfile(userId);
    setSkills([]);
    setExperiences([]);
    setEducation([]);
    setLanguages([]);
    setExtras([]);
  };

  const handleAutoFillFromCV = async () => {
    if (selectedCvId === "") return;
    setFilling(true);
    try {
      await api.autoFillProfile(userId, selectedCvId);
      loadAll();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("profile.autoFillFailed"));
    } finally {
      setFilling(false);
    }
  };

  // Skills
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;
    const s = await api.addSkill(userId, { name: skillName, category: skillCategory });
    setSkills([...skills, s]);
    setSkillName("");
  };

  const handleSaveSkill = async (id: number) => {
    const updated = await api.updateSkill(userId, id, {
      name: editData.name || undefined,
      category: editData.category || undefined,
    });
    setSkills(skills.map((s) => (s.id === id ? updated : s)));
    cancelEdit();
  };

  // Experiences
  const handleAddExp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim()) return;
    const exp = await api.addExperience(userId, {
      title: expTitle,
      description: expDesc || undefined,
      technologies: expTech || undefined,
      client: expClient || undefined,
      start_date: expStart || undefined,
      end_date: expEnd || undefined,
    });
    setExperiences([...experiences, exp]);
    setExpTitle(""); setExpDesc(""); setExpTech(""); setExpClient(""); setExpStart(""); setExpEnd("");
  };

  const handleSaveExp = async (id: number) => {
    const updated = await api.updateExperience(userId, id, {
      title: editData.title || undefined,
      description: editData.description || undefined,
      technologies: editData.technologies || undefined,
      client: editData.client || undefined,
      start_date: editData.start_date || undefined,
      end_date: editData.end_date || undefined,
    });
    setExperiences(experiences.map((e) => (e.id === id ? updated : e)));
    cancelEdit();
  };

  // Education
  const handleAddEdu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduSchool.trim() || !eduDegree.trim()) return;
    const ed = await api.addEducation(userId, {
      school: eduSchool,
      degree: eduDegree,
      field: eduField || undefined,
      description: eduDesc || undefined,
      start_date: eduStart || undefined,
      end_date: eduEnd || undefined,
    });
    setEducation([...education, ed]);
    setEduSchool(""); setEduDegree(""); setEduField(""); setEduDesc(""); setEduStart(""); setEduEnd("");
  };

  const handleSaveEdu = async (id: number) => {
    const updated = await api.updateEducation(userId, id, {
      school: editData.school || undefined,
      degree: editData.degree || undefined,
      field: editData.field || undefined,
      description: editData.description || undefined,
      start_date: editData.start_date || undefined,
      end_date: editData.end_date || undefined,
    });
    setEducation(education.map((e) => (e.id === id ? updated : e)));
    cancelEdit();
  };

  // Languages
  const handleAddLang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!langName.trim()) return;
    const l = await api.addLanguage(userId, { language: langName, level: langLevel });
    setLanguages([...languages, l]);
    setLangName("");
  };

  const handleSaveLang = async (id: number) => {
    const updated = await api.updateLanguage(userId, id, {
      language: editData.language || undefined,
      level: editData.level || undefined,
    });
    setLanguages(languages.map((l) => (l.id === id ? updated : l)));
    cancelEdit();
  };

  // Extracurriculars
  const handleAddExtra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraName.trim()) return;
    const ex = await api.addExtracurricular(userId, { name: extraName, description: extraDesc || undefined });
    setExtras([...extras, ex]);
    setExtraName(""); setExtraDesc("");
  };

  const handleSaveExtra = async (id: number) => {
    const updated = await api.updateExtracurricular(userId, id, {
      name: editData.name || undefined,
      description: editData.description || undefined,
    });
    setExtras(extras.map((e) => (e.id === id ? updated : e)));
    cancelEdit();
  };

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <h2>{t("profile.title")}</h2>
          <p className="page-desc">{t("profile.description")}</p>
        </div>
        {cvList.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={selectedCvId}
              onChange={(e) => setSelectedCvId(e.target.value ? Number(e.target.value) : "")}
              style={{ minWidth: 160 }}
            >
              <option value="">{t("profile.selectCV")}</option>
              {cvList.map((cv) => (
                <option key={cv.id} value={cv.id}>{cv.name}</option>
              ))}
            </select>
            <button
              className="btn-autofill"
              onClick={handleAutoFillFromCV}
              disabled={filling || selectedCvId === ""}
              style={{ cursor: filling ? "wait" : "pointer" }}
            >
              {filling ? t("profile.extracting") : t("profile.autoFill")}
            </button>
          </div>
        )}
        <button className="btn-clear-profile" onClick={handleClearProfile}>{t("profile.clearAll")}</button>
      </div>

      <nav className="pill-nav">
        <NavLink to="/profile" end className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("profile.profil")}</NavLink>
        <NavLink to="/profile/cvs" className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("profile.cvs")}</NavLink>
        <NavLink to="/profile/templates" className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("profile.templates")}</NavLink>
      </nav>

      {/* Bento grid for profile sections */}
      <div className="bento-grid-2">

        {/* Skills */}
        <Section title={t("profile.skills")}>
          <form onSubmit={handleAddSkill} className="form-row" style={{ marginBottom: 12 }}>
            <input placeholder={t("profile.skillName")} value={skillName} onChange={(e) => setSkillName(e.target.value)} style={{ flex: 1 }} />
            <select value={skillCategory} onChange={(e) => setSkillCategory(e.target.value)} style={{ width: "auto" }}>
              <option value="programming">{t("profile.programming")}</option>
              <option value="libraries">{t("profile.libraries")}</option>
              <option value="tools">{t("profile.tools")}</option>
              <option value="soft">{t("profile.soft")}</option>
              <option value="other">{t("profile.other")}</option>
            </select>
            <button type="submit">{t("profile.add")}</button>
          </form>
          <ul className="item-list">
            {skills.map((s) =>
              isEditing("skill", s.id) ? (
                <li key={s.id} className="editing-row">
                  <input value={editField("name")} onChange={(e) => setEditField("name", e.target.value)} />
                  <select value={editField("category")} onChange={(e) => setEditField("category", e.target.value)}>
                    <option value="programming">{t("profile.programming")}</option>
                    <option value="tools">{t("profile.tools")}</option>
                    <option value="soft">{t("profile.soft")}</option>
                  </select>
                  <button className="btn-save" onClick={() => handleSaveSkill(s.id)}>{t("profile.save")}</button>
                  <button className="btn-cancel" onClick={cancelEdit}>{t("profile.cancel")}</button>
                </li>
              ) : (
                <li key={s.id}>
                  <span className="tag">{s.category}</span> {s.name}
                  <button className="btn-edit" onClick={() => startEdit("skill", s.id, { name: s.name, category: s.category })}>{t("profile.edit")}</button>
                  <button className="btn-delete" onClick={() => { api.deleteSkill(userId, s.id); setSkills(skills.filter((x) => x.id !== s.id)); }}>x</button>
                </li>
              )
            )}
          </ul>
        </Section>

        {/* Languages */}
        <Section title={t("profile.languages")}>
          <form onSubmit={handleAddLang} className="form-row" style={{ marginBottom: 12 }}>
            <input placeholder={t("profile.language")} value={langName} onChange={(e) => setLangName(e.target.value)} style={{ flex: 1 }} />
            <select value={langLevel} onChange={(e) => setLangLevel(e.target.value)} style={{ width: "auto" }}>
              <option value="beginner">{t("profile.beginner")}</option>
              <option value="intermediate">{t("profile.intermediate")}</option>
              <option value="advanced">{t("profile.advanced")}</option>
              <option value="fluent">{t("profile.fluent")}</option>
              <option value="native">{t("profile.native")}</option>
            </select>
            <button type="submit">{t("profile.add")}</button>
          </form>
          <ul className="item-list">
            {languages.map((l) =>
              isEditing("lang", l.id) ? (
                <li key={l.id} className="editing-row">
                  <input value={editField("language")} onChange={(e) => setEditField("language", e.target.value)} />
                  <select value={editField("level")} onChange={(e) => setEditField("level", e.target.value)}>
                    <option value="beginner">{t("profile.beginner")}</option>
                    <option value="intermediate">{t("profile.intermediate")}</option>
                    <option value="advanced">{t("profile.advanced")}</option>
                    <option value="fluent">{t("profile.fluent")}</option>
                    <option value="native">{t("profile.native")}</option>
                  </select>
                  <button className="btn-save" onClick={() => handleSaveLang(l.id)}>{t("profile.save")}</button>
                  <button className="btn-cancel" onClick={cancelEdit}>{t("profile.cancel")}</button>
                </li>
              ) : (
                <li key={l.id}>
                  {l.language} <span className="tag">{l.level}</span>
                  <button className="btn-edit" onClick={() => startEdit("lang", l.id, { language: l.language, level: l.level })}>{t("profile.edit")}</button>
                  <button className="btn-delete" onClick={() => { api.deleteLanguage(userId, l.id); setLanguages(languages.filter((x) => x.id !== l.id)); }}>x</button>
                </li>
              )
            )}
          </ul>
        </Section>

        {/* Experiences — full width */}
        <div className="bento-span-2">
          <Section title={t("profile.experiences")}>
            <form onSubmit={handleAddExp} className="form-grid" style={{ marginBottom: 12 }}>
              <input placeholder={t("profile.titleField")} value={expTitle} onChange={(e) => setExpTitle(e.target.value)} />
              <input placeholder={t("profile.technologies")} value={expTech} onChange={(e) => setExpTech(e.target.value)} />
              <input placeholder={t("profile.client")} value={expClient} onChange={(e) => setExpClient(e.target.value)} />
              <div className="form-row">
                <input type="month" value={expStart} onChange={(e) => setExpStart(e.target.value)} title={t("profile.startDate")} />
                <input type="month" value={expEnd} onChange={(e) => setExpEnd(e.target.value)} title={t("profile.endDate")} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <input placeholder={t("profile.descriptionField")} value={expDesc} onChange={(e) => setExpDesc(e.target.value)} />
              </div>
              <button type="submit">{t("profile.add")}</button>
            </form>
            <ul className="item-list">
              {experiences.map((exp) =>
                isEditing("exp", exp.id) ? (
                  <li key={exp.id} className="editing-row" style={{ flexWrap: "wrap" }}>
                    <input placeholder="Title" value={editField("title")} onChange={(e) => setEditField("title", e.target.value)} />
                    <input placeholder="Technologies" value={editField("technologies")} onChange={(e) => setEditField("technologies", e.target.value)} />
                    <input placeholder="Client" value={editField("client")} onChange={(e) => setEditField("client", e.target.value)} />
                    <input type="month" value={editField("start_date")} onChange={(e) => setEditField("start_date", e.target.value)} />
                    <input type="month" value={editField("end_date")} onChange={(e) => setEditField("end_date", e.target.value)} />
                    <input placeholder="Description" value={editField("description")} onChange={(e) => setEditField("description", e.target.value)} style={{ flex: "1 1 100%" }} />
                    <button className="btn-save" onClick={() => handleSaveExp(exp.id)}>{t("profile.save")}</button>
                    <button className="btn-cancel" onClick={cancelEdit}>{t("profile.cancel")}</button>
                  </li>
                ) : (
                  <li key={exp.id}>
                    <strong>{exp.title}</strong>
                    {exp.client && <span className="tag">{exp.client}</span>}
                    {exp.technologies && <span className="tag">{exp.technologies}</span>}
                    {(exp.start_date || exp.end_date) && (
                      <span className="hint"> ({exp.start_date ?? "?"} - {exp.end_date ?? t("profile.present")})</span>
                    )}
                    <button className="btn-edit" onClick={() => startEdit("exp", exp.id, {
                      title: exp.title,
                      technologies: exp.technologies ?? "",
                      client: exp.client ?? "",
                      start_date: exp.start_date ?? "",
                      end_date: exp.end_date ?? "",
                      description: exp.description ?? "",
                    })}>{t("profile.edit")}</button>
                    <button className="btn-delete" onClick={() => { api.deleteExperience(userId, exp.id); setExperiences(experiences.filter((x) => x.id !== exp.id)); }}>x</button>
                  </li>
                )
              )}
            </ul>
          </Section>
        </div>

        {/* Education — full width */}
        <div className="bento-span-2">
          <Section title={t("profile.education")}>
            <form onSubmit={handleAddEdu} className="form-grid" style={{ marginBottom: 12 }}>
              <input placeholder={t("profile.school")} value={eduSchool} onChange={(e) => setEduSchool(e.target.value)} />
              <input placeholder={t("profile.degree")} value={eduDegree} onChange={(e) => setEduDegree(e.target.value)} />
              <input placeholder={t("profile.field")} value={eduField} onChange={(e) => setEduField(e.target.value)} />
              <div className="form-row">
                <input type="month" value={eduStart} onChange={(e) => setEduStart(e.target.value)} title={t("profile.startDate")} />
                <input type="month" value={eduEnd} onChange={(e) => setEduEnd(e.target.value)} title={t("profile.endDate")} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <input placeholder={t("profile.descriptionField")} value={eduDesc} onChange={(e) => setEduDesc(e.target.value)} />
              </div>
              <button type="submit">{t("profile.add")}</button>
            </form>
            <ul className="item-list">
              {education.map((ed) =>
                isEditing("edu", ed.id) ? (
                  <li key={ed.id} className="editing-row" style={{ flexWrap: "wrap" }}>
                    <input placeholder="School" value={editField("school")} onChange={(e) => setEditField("school", e.target.value)} />
                    <input placeholder="Degree" value={editField("degree")} onChange={(e) => setEditField("degree", e.target.value)} />
                    <input placeholder="Field" value={editField("field")} onChange={(e) => setEditField("field", e.target.value)} />
                    <input type="month" value={editField("start_date")} onChange={(e) => setEditField("start_date", e.target.value)} />
                    <input type="month" value={editField("end_date")} onChange={(e) => setEditField("end_date", e.target.value)} />
                    <input placeholder="Description" value={editField("description")} onChange={(e) => setEditField("description", e.target.value)} style={{ flex: "1 1 100%" }} />
                    <button className="btn-save" onClick={() => handleSaveEdu(ed.id)}>{t("profile.save")}</button>
                    <button className="btn-cancel" onClick={cancelEdit}>{t("profile.cancel")}</button>
                  </li>
                ) : (
                  <li key={ed.id}>
                    <strong>{ed.degree}</strong> {t("profile.at")} {ed.school}
                    {ed.field && <span> {t("profile.in")} {ed.field}</span>}
                    {(ed.start_date || ed.end_date) && (
                      <span className="hint"> ({ed.start_date ?? "?"} - {ed.end_date ?? t("profile.present")})</span>
                    )}
                    <button className="btn-edit" onClick={() => startEdit("edu", ed.id, {
                      school: ed.school,
                      degree: ed.degree,
                      field: ed.field ?? "",
                      start_date: ed.start_date ?? "",
                      end_date: ed.end_date ?? "",
                      description: ed.description ?? "",
                    })}>{t("profile.edit")}</button>
                    <button className="btn-delete" onClick={() => { api.deleteEducation(userId, ed.id); setEducation(education.filter((x) => x.id !== ed.id)); }}>x</button>
                  </li>
                )
              )}
            </ul>
          </Section>
        </div>

        {/* Extracurriculars */}
        <div className="bento-span-2">
          <Section title={t("profile.extracurriculars")}>
            <form onSubmit={handleAddExtra} className="form-row" style={{ marginBottom: 12 }}>
              <input placeholder={t("profile.namePlaceholder")} value={extraName} onChange={(e) => setExtraName(e.target.value)} style={{ flex: 1 }} />
              <input placeholder={t("profile.descOptional")} value={extraDesc} onChange={(e) => setExtraDesc(e.target.value)} style={{ flex: 2 }} />
              <button type="submit">{t("profile.add")}</button>
            </form>
            <ul className="item-list">
              {extras.map((ex) =>
                isEditing("extra", ex.id) ? (
                  <li key={ex.id} className="editing-row">
                    <input value={editField("name")} onChange={(e) => setEditField("name", e.target.value)} />
                    <input placeholder="Description" value={editField("description")} onChange={(e) => setEditField("description", e.target.value)} />
                    <button className="btn-save" onClick={() => handleSaveExtra(ex.id)}>{t("profile.save")}</button>
                    <button className="btn-cancel" onClick={cancelEdit}>{t("profile.cancel")}</button>
                  </li>
                ) : (
                  <li key={ex.id}>
                    <strong>{ex.name}</strong>
                    {ex.description && <span className="hint" style={{ marginLeft: 8 }}>{ex.description}</span>}
                    <button className="btn-edit" onClick={() => startEdit("extra", ex.id, { name: ex.name, description: ex.description ?? "" })}>{t("profile.edit")}</button>
                    <button className="btn-delete" onClick={() => { api.deleteExtracurricular(userId, ex.id); setExtras(extras.filter((x) => x.id !== ex.id)); }}>x</button>
                  </li>
                )
              )}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
