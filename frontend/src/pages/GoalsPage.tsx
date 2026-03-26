import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as api from "../api";
import GoalHistoryChart from "../components/GoalHistoryChart";

export default function GoalsPage({ userId }: { userId: number }) {
  const { t } = useTranslation();

  const [summary, setSummary] = useState<api.DailyGoalsSummary | null>(null);
  const [allGoals, setAllGoals] = useState<api.Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // -- Create form --
  const [creating, setCreating] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formFrequency, setFormFrequency] = useState("daily");
  const [formTarget, setFormTarget] = useState(1);

  // -- Edit --
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editFrequency, setEditFrequency] = useState("daily");
  const [editTarget, setEditTarget] = useState(1);

  // -- Progress history --
  const [historyGoalId, setHistoryGoalId] = useState<number | null>(null);
  const [history, setHistory] = useState<api.GoalProgress[]>([]);

  const loadData = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    Promise.all([
      api.getGoalsSummary(userId),
      api.getGoals(userId, false),
    ])
      .then(([s, gResp]) => {
        setSummary(s);
        setAllGoals(gResp.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, refreshKey]);

  const handleCreate = async () => {
    await api.createGoal(userId, {
      title: formTitle,
      frequency: formFrequency,
      target_count: formTarget,
    });
    setCreating(false);
    setFormTitle("");
    setFormFrequency("daily");
    setFormTarget(1);
    loadData();
  };

  const handleDelete = async (id: number) => {
    await api.deleteGoal(userId, id);
    loadData();
  };

  const handleToggleActive = async (goal: api.Goal) => {
    await api.updateGoal(userId, goal.id, { is_active: !goal.is_active });
    loadData();
  };

  const handleIncrement = async (goal: api.GoalWithProgress) => {
    await api.logGoalProgress(userId, goal.id, {
      completed_count: goal.today_daily_completed + 1,
    });
    loadData();
  };

  const handleDecrement = async (goal: api.GoalWithProgress) => {
    if (goal.today_daily_completed <= 0) return;
    await api.logGoalProgress(userId, goal.id, {
      completed_count: goal.today_daily_completed - 1,
    });
    loadData();
  };

  const startEdit = (goal: api.Goal) => {
    setEditingId(goal.id);
    setEditTitle(goal.title);
    setEditFrequency(goal.frequency);
    setEditTarget(goal.target_count);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    await api.updateGoal(userId, editingId, {
      title: editTitle,
      frequency: editFrequency,
      target_count: editTarget,
    });
    setEditingId(null);
    loadData();
  };

  const toggleHistory = async (goalId: number) => {
    if (historyGoalId === goalId) {
      setHistoryGoalId(null);
      return;
    }
    setHistoryGoalId(goalId);
    const goal = allGoals.find((g) => g.id === goalId);
    const daysBack = goal?.frequency === "weekly" ? 56 : 29;
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - daysBack);
    const entries = await api.getGoalProgress(
      userId,
      goalId,
      start.toISOString().slice(0, 10),
      today.toISOString().slice(0, 10),
    );
    setHistory(entries);
  };

  const displayedGoals = showInactive ? allGoals : allGoals.filter((g) => g.is_active);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>{t("goals.title")}</h2>
          <p className="page-subtitle">{t("goals.subtitle")}</p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          + {t("goals.newGoal")}
        </button>
      </div>

      {/* Today's summary */}
      {summary && (
        <div className="goals-summary-bar">
          <div className="goals-summary-stat">
            <span className="stat-value">{summary.completed_today}/{summary.total_goals}</span>
            <span className="stat-label">{t("goals.completedToday")}</span>
          </div>
          <div className="goals-summary-stat">
            <span className="stat-value">{summary.longest_streak}</span>
            <span className="stat-label">{t("goals.longestStreak")}</span>
          </div>
        </div>
      )}

      {/* Create form */}
      {creating && (
        <div className="glass-card goal-form">
          <div className="glass-card-header">
            <h3>{t("goals.newGoal")}</h3>
            <button className="btn-ghost" onClick={() => setCreating(false)}>{"\u2715"}</button>
          </div>
          <div className="glass-card-body">
            <div className="form-grid">
              <input
                type="text"
                placeholder={t("goals.titlePlaceholder")}
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
              <select value={formFrequency} onChange={(e) => setFormFrequency(e.target.value)}>
                <option value="daily">{t("goals.daily")}</option>
                <option value="weekly">{t("goals.weekly")}</option>
              </select>
              <div className="goal-target-input">
                <label>{t("goals.targetCount")}</label>
                <input
                  type="number"
                  min={1}
                  value={formTarget}
                  onChange={(e) => setFormTarget(Math.max(1, Number(e.target.value)))}
                />
              </div>
            </div>
            <div className="memo-form-actions">
              <button className="btn-ghost" onClick={() => setCreating(false)}>
                {t("goals.cancel")}
              </button>
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={!formTitle.trim()}
              >
                {t("goals.create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle inactive */}
      <div className="goals-filter-bar">
        <button
          className={`btn-ghost btn-sm goals-toggle-btn ${showInactive ? "active" : ""}`}
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? "\u23F8" : "\u25B6"} {t("goals.showInactive")}
        </button>
      </div>

      {/* Goals list */}
      {loading ? (
        <p className="loading-text">{t("goals.loading")}</p>
      ) : displayedGoals.length === 0 ? (
        <div className="empty-state">
          <p>{t("goals.noGoals")}</p>
        </div>
      ) : (
        <div className="goals-list">
          {displayedGoals.map((goal) => {
            const withProgress = summary?.goals.find((g) => g.id === goal.id);
            const todayCompleted = withProgress?.today_completed ?? 0;
            const todayDailyCompleted = withProgress?.today_daily_completed ?? 0;
            const streak = withProgress?.current_streak ?? 0;
            const pct = Math.min(100, (todayCompleted / goal.target_count) * 100);
            const isComplete = todayCompleted >= goal.target_count;

            return (
              <div key={goal.id} className={`glass-card goal-card ${!goal.is_active ? "inactive" : ""}`}>
                {editingId === goal.id ? (
                  <div className="glass-card-body">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <select value={editFrequency} onChange={(e) => setEditFrequency(e.target.value)}>
                      <option value="daily">{t("goals.daily")}</option>
                      <option value="weekly">{t("goals.weekly")}</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={editTarget}
                      onChange={(e) => setEditTarget(Math.max(1, Number(e.target.value)))}
                    />
                    <div className="memo-form-actions">
                      <button className="btn-ghost" onClick={() => setEditingId(null)}>
                        {t("goals.cancel")}
                      </button>
                      <button className="btn-primary" onClick={handleUpdate}>
                        {t("goals.save")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="goal-card-header">
                      <div className="goal-info">
                        <h4>{goal.title}</h4>
                        <span className="badge">{t(`goals.${goal.frequency}`)}</span>
                        {streak > 0 && (
                          <span className="goal-streak" title={
                            goal.frequency === "weekly"
                              ? t("goals.streakWeeks", { count: streak })
                              : t("goals.streakDays", { count: streak })
                          }>
                            {streak}{goal.frequency === "weekly" ? "w" : "d"}
                          </span>
                        )}
                      </div>
                      <div className="goal-card-actions">
                        <button className="btn-icon" onClick={() => startEdit(goal)} title={t("goals.edit")}>
                          {"\u270E"}
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleToggleActive(goal)}
                          title={goal.is_active ? t("goals.pause") : t("goals.resume")}
                        >
                          {goal.is_active ? "\u23F8" : "\u25B6"}
                        </button>
                        <button className="btn-icon danger" onClick={() => handleDelete(goal.id)} title={t("goals.delete")}>
                          {"\u2717"}
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="goal-progress-section">
                      <div className="goal-progress-bar-container">
                        <div
                          className={`goal-progress-bar ${isComplete ? "complete" : ""}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="goal-progress-controls">
                        <button
                          className="btn-icon"
                          onClick={() => withProgress && handleDecrement(withProgress)}
                          disabled={todayDailyCompleted <= 0}
                        >
                          -
                        </button>
                        <span className="goal-progress-text">
                          {todayCompleted} / {goal.target_count}
                        </span>
                        <button
                          className="btn-icon btn-increment"
                          onClick={() => withProgress && handleIncrement(withProgress)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* History toggle */}
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => toggleHistory(goal.id)}
                    >
                      {historyGoalId === goal.id ? t("goals.hideHistory") : t("goals.showHistory")}
                    </button>
                    {historyGoalId === goal.id && (
                      <div className="goal-history">
                        <GoalHistoryChart history={history} targetCount={goal.target_count} frequency={goal.frequency} />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
