import { useEffect, useState } from "react";
import * as api from "../api";

export default function SettingsPage({
  userId, userName, userEmail, onLogout,
}: {
  userId: number; userName: string; userEmail: string; onLogout: () => void;
}) {
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
      alert(err instanceof Error ? err.message : "Failed to save instructions");
    } finally {
      setSavingInstructions(false);
    }
  };

  const instructionsChanged = aiInstructions !== aiInstructionsSaved;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Settings</h2>
        <p className="page-desc">Account and AI configuration</p>
      </div>

      {/* Account */}
      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div className="glass-card-header"><h3>Account</h3></div>
        <div className="glass-card-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
            <div><span style={{ color: "var(--text-muted)", width: 80, display: "inline-block" }}>Name:</span> <strong>{userName}</strong></div>
            <div><span style={{ color: "var(--text-muted)", width: 80, display: "inline-block" }}>Email:</span> <strong>{userEmail}</strong></div>
          </div>
          <button onClick={onLogout} className="btn-danger" style={{ marginTop: 16 }}>
            Logout
          </button>
        </div>
      </div>

      {/* AI Instructions */}
      <div className="glass-card">
        <div className="glass-card-header"><h3>AI Instructions</h3></div>
        <div className="glass-card-body">
          <p className="hint" style={{ marginBottom: 8 }}>
            Custom instructions sent to the AI for every generation (CV, cover letter, skill gap).
          </p>
          <textarea
            value={aiInstructions}
            onChange={(e) => setAiInstructions(e.target.value)}
            placeholder="e.g. Do not modify the Education section, Always mention Python first..."
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
              {savingInstructions ? "Saving..." : "Save"}
            </button>
            {!instructionsChanged && aiInstructionsSaved && (
              <span className="hint">Saved</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
