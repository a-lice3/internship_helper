import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as api from "../api";
import i18n from "../i18n";

export default function SettingsPage({
  userId, userName, userEmail, onLogout,
}: {
  userId: number; userName: string; userEmail: string; onLogout: () => void;
}) {
  const { t } = useTranslation();
  const [aiInstructions, setAiInstructions] = useState("");
  const [aiInstructionsSaved, setAiInstructionsSaved] = useState("");
  const [savingInstructions, setSavingInstructions] = useState(false);

  useEffect(() => {
    api.getAIInstructions(userId).then((res) => {
      const val = res.ai_instructions ?? "";
      setAiInstructions(val);
      setAiInstructionsSaved(val);
    });
  }, [userId]);

  const handleSaveInstructions = async () => {
    setSavingInstructions(true);
    try {
      await api.updateAIInstructions(userId, aiInstructions);
      setAiInstructionsSaved(aiInstructions);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("settings.failedSave"));
    } finally {
      setSavingInstructions(false);
    }
  };

  const instructionsChanged = aiInstructions !== aiInstructionsSaved;

  return (
    <div className="page">
      <div className="page-header">
        <h2>{t("settings.title")}</h2>
        <p className="page-desc">{t("settings.description")}</p>
      </div>

      {/* Account */}
      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div className="glass-card-header"><h3>{t("settings.account")}</h3></div>
        <div className="glass-card-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
            <div><span style={{ color: "var(--text-muted)", width: 80, display: "inline-block" }}>{t("settings.nameLabel")}</span> <strong>{userName}</strong></div>
            <div><span style={{ color: "var(--text-muted)", width: 80, display: "inline-block" }}>{t("settings.emailLabel")}</span> <strong>{userEmail}</strong></div>
          </div>
          <button onClick={onLogout} className="btn-danger" style={{ marginTop: 16 }}>
            {t("settings.logout")}
          </button>
        </div>
      </div>

      {/* Language */}
      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div className="glass-card-header"><h3>{t("settings.languageLabel")}</h3></div>
        <div className="glass-card-body">
          <p className="hint" style={{ marginBottom: 8 }}>
            {t("settings.languageHint")}
          </p>
          <select
            value={["fr", "de", "es"].find((l) => i18n.language?.startsWith(l)) || "en"}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            style={{ width: "auto" }}
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
          </select>
        </div>
      </div>

      {/* AI Instructions */}
      <div className="glass-card">
        <div className="glass-card-header"><h3>{t("settings.aiInstructions")}</h3></div>
        <div className="glass-card-body">
          <p className="hint" style={{ marginBottom: 8 }}>
            {t("settings.aiHint")}
          </p>
          <textarea
            value={aiInstructions}
            onChange={(e) => setAiInstructions(e.target.value)}
            placeholder={t("settings.aiPlaceholder")}
            rows={6}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={handleSaveInstructions}
              disabled={!instructionsChanged || savingInstructions}
              className="btn-primary"
              style={{ boxShadow: "none" }}
            >
              {savingInstructions ? t("settings.saving") : t("settings.save")}
            </button>
            {!instructionsChanged && aiInstructionsSaved && (
              <span className="hint">{t("settings.saved")}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
