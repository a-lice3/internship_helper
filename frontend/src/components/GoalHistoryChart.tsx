import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { GoalProgress } from "../api";

interface Props {
  history: GoalProgress[];
  targetCount: number;
  frequency?: string;
}

/** Fill in missing dates in [start..end] range with 0 completed. */
function buildDailyData(
  history: GoalProgress[],
  days: number,
): { date: string; completed: number }[] {
  const map = new Map<string, number>();
  for (const e of history) map.set(e.date, e.completed_count);

  const result: { date: string; completed: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, completed: map.get(key) ?? 0 });
  }
  return result;
}

/** Get the Monday of the ISO week containing *d*. */
function getMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Aggregate daily entries into ISO weeks (Mon-Sun). Returns ~last 8 weeks. */
function buildWeeklyData(
  history: GoalProgress[],
): { date: string; completed: number }[] {
  // Build per-date map
  const dayMap = new Map<string, number>();
  for (const e of history) dayMap.set(e.date, e.completed_count);

  // Walk back ~8 weeks from today
  const today = new Date();
  const currentMonday = getMonday(today);
  const weeks: { date: string; completed: number }[] = [];

  for (let w = 7; w >= 0; w--) {
    const monday = new Date(currentMonday);
    monday.setDate(monday.getDate() - w * 7);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    let total = 0;
    for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      total += dayMap.get(key) ?? 0;
    }

    const label = monday.toISOString().slice(0, 10);
    weeks.push({ date: label, completed: total });
  }

  return weeks;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatWeekLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function GoalHistoryChart({ history, targetCount, frequency }: Props) {
  const { t } = useTranslation();
  const isWeekly = frequency === "weekly";

  const data = useMemo(
    () => isWeekly ? buildWeeklyData(history) : buildDailyData(history, 30),
    [history, isWeekly],
  );

  const metCount = data.filter((d) => d.completed >= targetCount).length;
  const completionRate = data.length > 0 ? Math.round((metCount / data.length) * 100) : 0;

  // -- Bar chart dimensions --
  const barWidth = isWeekly ? 28 : 14;
  const barGap = isWeekly ? 8 : 4;
  const chartHeight = 100;
  const labelHeight = 20;
  const svgWidth = data.length * (barWidth + barGap);
  const svgHeight = chartHeight + labelHeight + 10;
  const maxVal = Math.max(targetCount, ...data.map((d) => d.completed));

  // -- Donut dimensions --
  const donutSize = 80;
  const donutStroke = 10;
  const donutRadius = (donutSize - donutStroke) / 2;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutOffset = donutCircumference * (1 - completionRate / 100);

  // Show date label every ~5 bars
  const labelInterval = Math.max(1, Math.floor(data.length / 6));

  return (
    <div className="goal-chart-container">
      {/* Bar chart */}
      <div className="goal-chart-bar-section">
        <h5 className="goal-chart-label">
          {isWeekly ? t("goals.last8Weeks") : t("goals.last30Days")}
        </h5>
        <div className="goal-chart-bar-scroll">
          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="goal-chart-svg"
          >
            {/* Target line */}
            <line
              x1={0}
              y1={chartHeight - (targetCount / maxVal) * chartHeight}
              x2={svgWidth}
              y2={chartHeight - (targetCount / maxVal) * chartHeight}
              stroke="var(--text-muted)"
              strokeDasharray="4 3"
              strokeWidth={1}
              opacity={0.5}
            />
            {data.map((d, i) => {
              const h = maxVal > 0 ? (d.completed / maxVal) * chartHeight : 0;
              const x = i * (barWidth + barGap);
              const met = d.completed >= targetCount;
              const isLast = i === data.length - 1;
              const fill = d.completed === 0
                ? "var(--border-strong)"
                : met
                  ? "var(--success)"
                  : "var(--warning)";
              return (
                <g key={d.date}>
                  <rect
                    x={x}
                    y={chartHeight - h}
                    width={barWidth}
                    height={Math.max(h, 2)}
                    rx={3}
                    fill={fill}
                    opacity={isLast ? 1 : 0.8}
                  >
                    <title>{`${isWeekly ? t("goals.weekOf") + " " : ""}${d.date}: ${d.completed}/${targetCount}`}</title>
                  </rect>
                  {i % labelInterval === 0 && (
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight + labelHeight}
                      textAnchor="middle"
                      className="goal-chart-date-label"
                    >
                      {isWeekly ? formatWeekLabel(d.date) : formatShortDate(d.date)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="goal-chart-legend">
          <span className="goal-chart-legend-item">
            <span className="goal-chart-dot" style={{ background: "var(--success)" }} />
            {t("goals.chartMet")}
          </span>
          <span className="goal-chart-legend-item">
            <span className="goal-chart-dot" style={{ background: "var(--warning)" }} />
            {t("goals.chartPartial")}
          </span>
          <span className="goal-chart-legend-item">
            <span className="goal-chart-dot" style={{ background: "var(--border-strong)" }} />
            {t("goals.chartMissed")}
          </span>
          <span className="goal-chart-legend-item goal-chart-legend-target">
            ---- {t("goals.chartTarget")}
          </span>
        </div>
      </div>

      {/* Donut */}
      <div className="goal-chart-donut-section">
        <h5 className="goal-chart-label">{t("goals.completionRate")}</h5>
        <svg width={donutSize} height={donutSize} className="goal-chart-donut">
          {/* Background circle */}
          <circle
            cx={donutSize / 2}
            cy={donutSize / 2}
            r={donutRadius}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth={donutStroke}
          />
          {/* Progress arc */}
          <circle
            cx={donutSize / 2}
            cy={donutSize / 2}
            r={donutRadius}
            fill="none"
            stroke={completionRate >= 70 ? "var(--success)" : completionRate >= 40 ? "var(--warning)" : "var(--danger)"}
            strokeWidth={donutStroke}
            strokeDasharray={donutCircumference}
            strokeDashoffset={donutOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${donutSize / 2} ${donutSize / 2})`}
            className="goal-chart-donut-arc"
          />
          <text
            x={donutSize / 2}
            y={donutSize / 2}
            textAnchor="middle"
            dominantBaseline="central"
            className="goal-chart-donut-text"
          >
            {completionRate}%
          </text>
        </svg>
        <span className="goal-chart-donut-detail">
          {isWeekly
            ? t("goals.weeksMetTarget", { met: metCount, total: data.length })
            : t("goals.daysMetTarget", { met: metCount, total: data.length })}
        </span>
      </div>
    </div>
  );
}
