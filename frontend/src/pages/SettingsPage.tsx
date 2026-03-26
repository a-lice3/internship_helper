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

  const [personality, setPersonality] = useState("");
  const [personalitySaved, setPersonalitySaved] = useState("");
  const [savingPersonality, setSavingPersonality] = useState(false);
  const [resettingPersonality, setResettingPersonality] = useState(false);

  useEffect(() => {
    api.getAIInstructions(userId).then((res) => {
      const val = res.ai_instructions ?? "";
      setAiInstructions(val);
      setAiInstructionsSaved(val);
    });
    api.getPersonalityProfile(userId).then((res) => {
      const val = res.personality_profile ?? "";
      setPersonality(val);
      setPersonalitySaved(val);
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

  const handleSavePersonality = async () => {
    setSavingPersonality(true);
    try {
      await api.updatePersonalityProfile(userId, personality);
      setPersonalitySaved(personality);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("settings.failedSave"));
    } finally {
      setSavingPersonality(false);
    }
  };

  const handleResetPersonality = async () => {
    setResettingPersonality(true);
    try {
      await api.resetPersonalityProfile(userId);
      setPersonality("");
      setPersonalitySaved("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("settings.failedSave"));
    } finally {
      setResettingPersonality(false);
    }
  };

  const personalityChanged = personality !== personalitySaved;

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
      <div className="glass-card" style={{ marginBottom: 20 }}>
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

      {/* Personality Profile */}
      <div className="glass-card">
        <div className="glass-card-header"><h3>{t("settings.personalityProfile")}</h3></div>
        <div className="glass-card-body">
          <p className="hint" style={{ marginBottom: 8 }}>
            {t("settings.personalityHint")}
          </p>
          {personalitySaved ? (
            <>
              <textarea
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                rows={12}
                title={t("settings.personalityProfile")}
                placeholder={t("settings.personalityProfile")}
                style={{ width: "100%", fontFamily: "monospace", fontSize: 13 }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={handleSavePersonality}
                  disabled={!personalityChanged || savingPersonality}
                  className="btn-primary"
                  style={{ boxShadow: "none" }}
                >
                  {savingPersonality ? t("settings.saving") : t("settings.save")}
                </button>
                <button
                  type="button"
                  onClick={handleResetPersonality}
                  disabled={resettingPersonality}
                  className="btn-danger"
                  style={{ boxShadow: "none" }}
                >
                  {resettingPersonality ? "..." : t("settings.reset")}
                </button>
                {!personalityChanged && personalitySaved && (
                  <span className="hint">{t("settings.saved")}</span>
                )}
              </div>
            </>
          ) : (
            <p className="hint" style={{ fontStyle: "italic" }}>
              {t("settings.personalityEmpty")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
