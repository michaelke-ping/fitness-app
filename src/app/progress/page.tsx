"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface WorkoutSession {
  id: string;
  started_at: string;
  completed_at: string | null;
  session_exercises: SessionExercise[];
}

interface SessionExercise {
  id: string;
  name: string;
  completed: boolean;
  completed_at: string | null;
}

interface WeekData {
  label: string;
  workoutCount: number;
  completionRate: number;
}

interface ExerciseCount {
  name: string;
  count: number;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function toLocalDateString(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeStreaks(sessions: WorkoutSession[]): {
  currentStreak: number;
  longestStreak: number;
} {
  const completedDates = new Set<string>();
  for (const s of sessions) {
    if (s.completed_at) {
      completedDates.add(toLocalDateString(s.completed_at));
    }
  }

  if (completedDates.size === 0) return { currentStreak: 0, longestStreak: 0 };

  const sorted = Array.from(completedDates).sort();
  const earliest = new Date(sorted[0]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  earliest.setHours(0, 0, 0, 0);

  let longestStreak = 0;
  let currentRun = 0;
  const d = new Date(earliest);
  while (d <= today) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (completedDates.has(key)) {
      currentRun++;
      if (currentRun > longestStreak) longestStreak = currentRun;
    } else {
      currentRun = 0;
    }
    d.setDate(d.getDate() + 1);
  }

  let currentStreak = 0;
  const check = new Date(today);
  const todayKey = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, "0")}-${String(check.getDate()).padStart(2, "0")}`;
  if (!completedDates.has(todayKey)) {
    check.setDate(check.getDate() - 1);
  }
  while (true) {
    const key = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, "0")}-${String(check.getDate()).padStart(2, "0")}`;
    if (completedDates.has(key)) {
      currentStreak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }

  return { currentStreak, longestStreak };
}

interface CalendarDay {
  date: string;
  count: number;
  isToday: boolean;
  dayOfMonth: number;
  month: number;
  year: number;
}

function buildCalendarDays(sessions: WorkoutSession[]): CalendarDay[] {
  const countsByDate: Record<string, number> = {};
  for (const s of sessions) {
    if (s.completed_at) {
      const key = toLocalDateString(s.completed_at);
      countsByDate[key] = (countsByDate[key] || 0) + 1;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toLocalDateString(today.toISOString());

  const todayDow = today.getDay();
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + (6 - todayDow));

  const startDate = new Date(endOfWeek);
  startDate.setDate(startDate.getDate() - 83);

  const days: CalendarDay[] = [];
  const d = new Date(startDate);
  for (let i = 0; i < 84; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({
      date: key,
      count: countsByDate[key] || 0,
      isToday: key === todayKey,
      dayOfMonth: d.getDate(),
      month: d.getMonth(),
      year: d.getFullYear(),
    });
    d.setDate(d.getDate() + 1);
  }

  return days;
}

function StreakCalendar({ sessions }: { sessions: WorkoutSession[] }) {
  const { currentStreak, longestStreak } = computeStreaks(sessions);
  const days = buildCalendarDays(sessions);

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const showLabel = [false, true, false, true, false, true, false];

  const monthLabels: { col: number; label: string }[] = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let lastMonth = -1;
  for (let i = 0; i < days.length; i++) {
    const col = Math.floor(i / 7);
    const row = i % 7;
    if (row === 0 && days[i].month !== lastMonth) {
      monthLabels.push({ col, label: monthNames[days[i].month] });
      lastMonth = days[i].month;
    }
  }

  function getCellColor(count: number, isToday: boolean): string {
    let bg = "bg-zinc-100 dark:bg-zinc-800";
    if (count === 1) bg = "bg-blue-200 dark:bg-blue-900";
    if (count >= 2) bg = "bg-blue-400 dark:bg-blue-600";
    const ring = isToday ? " ring-2 ring-blue-500 dark:ring-blue-400" : "";
    return `${bg}${ring}`;
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 mb-6">
      <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider">Workout Streak</h2>
      <div className="flex gap-4 mb-4 text-sm text-zinc-700 dark:text-zinc-300">
        <span>
          Current: <span className="font-semibold">{currentStreak} {currentStreak === 1 ? "day" : "days"}</span>
        </span>
        <span className="text-zinc-300 dark:text-zinc-600">|</span>
        <span>
          Best: <span className="font-semibold">{longestStreak} {longestStreak === 1 ? "day" : "days"}</span>
        </span>
      </div>
      <div className="flex gap-1">
        <div className="grid grid-rows-7 gap-1 mr-1 text-[10px] text-zinc-400 dark:text-zinc-500">
          {dayLabels.map((label, i) => (
            <div key={i} className="w-3 h-3 flex items-center justify-end leading-none">
              {showLabel[i] ? label : ""}
            </div>
          ))}
        </div>
        <div className="grid grid-rows-7 grid-flow-col gap-1">
          {days.map((day) => (
            <div
              key={day.date}
              className={`w-3 h-3 rounded-sm ${getCellColor(day.count, day.isToday)}`}
              title={`${day.date}: ${day.count} workout${day.count !== 1 ? "s" : ""}`}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-1 mt-1">
        <div className="w-3 mr-1" />
        <div className="flex text-[10px] text-zinc-400 dark:text-zinc-500" style={{ position: "relative", height: "14px", width: "100%" }}>
          {monthLabels.map((m, i) => (
            <span
              key={i}
              style={{ position: "absolute", left: `${m.col * 16}px` }}
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function computeWeeklyData(sessions: WorkoutSession[]): WeekData[] {
  const now = new Date();
  const weeks: WeekData[] = [];

  for (let i = 7; i >= 0; i--) {
    const weekStart = getWeekStart(new Date(now));
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekSessions = sessions.filter((s) => {
      if (!s.completed_at) return false;
      const d = new Date(s.completed_at);
      return d >= weekStart && d < weekEnd;
    });

    let totalRate = 0;
    let ratedSessions = 0;
    for (const session of weekSessions) {
      const total = session.session_exercises.length;
      if (total > 0) {
        const completed = session.session_exercises.filter(
          (e) => e.completed
        ).length;
        totalRate += completed / total;
        ratedSessions++;
      }
    }

    weeks.push({
      label: formatWeekLabel(weekStart),
      workoutCount: weekSessions.length,
      completionRate: ratedSessions > 0 ? totalRate / ratedSessions : 0,
    });
  }

  return weeks;
}

function computeTopExercises(sessions: WorkoutSession[]): ExerciseCount[] {
  const counts: Record<string, number> = {};
  for (const session of sessions) {
    for (const exercise of session.session_exercises) {
      if (exercise.completed) {
        counts[exercise.name] = (counts[exercise.name] || 0) + 1;
      }
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function BarChart({
  data,
  labels,
  maxValue,
}: {
  data: number[];
  labels: string[];
  maxValue: number;
}) {
  const chartHeight = 120;
  const chartWidth = 320;
  const barWidth = 28;
  const gap = 12;
  const labelHeight = 20;
  const totalWidth = data.length * (barWidth + gap) - gap;
  const offsetX = (chartWidth - totalWidth) / 2;
  const safeMax = maxValue > 0 ? maxValue : 1;

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight + labelHeight}`}
      className="w-full"
      role="img"
      aria-label="Workouts per week bar chart"
    >
      {data.map((value, i) => {
        const barHeight = (value / safeMax) * chartHeight;
        return (
          <g key={i}>
            <rect
              x={offsetX + i * (barWidth + gap)}
              y={chartHeight - barHeight}
              width={barWidth}
              height={Math.max(barHeight, 0)}
              rx={4}
              className="fill-blue-500 dark:fill-blue-400"
            />
            {value > 0 && (
              <text
                x={offsetX + i * (barWidth + gap) + barWidth / 2}
                y={chartHeight - barHeight - 4}
                textAnchor="middle"
                className="fill-zinc-700 dark:fill-zinc-300 text-[10px]"
                fontSize="10"
              >
                {value}
              </text>
            )}
            <text
              x={offsetX + i * (barWidth + gap) + barWidth / 2}
              y={chartHeight + labelHeight - 4}
              textAnchor="middle"
              className="fill-zinc-500 dark:fill-zinc-400 text-[9px]"
              fontSize="9"
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function CompletionChart({
  data,
  labels,
}: {
  data: number[];
  labels: string[];
}) {
  const chartHeight = 120;
  const chartWidth = 320;
  const barWidth = 28;
  const gap = 12;
  const labelHeight = 20;
  const totalWidth = data.length * (barWidth + gap) - gap;
  const offsetX = (chartWidth - totalWidth) / 2;

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight + labelHeight}`}
      className="w-full"
      role="img"
      aria-label="Workout completion rate chart"
    >
      {data.map((value, i) => {
        const barHeight = value * chartHeight;
        return (
          <g key={i}>
            <rect
              x={offsetX + i * (barWidth + gap)}
              y={0}
              width={barWidth}
              height={chartHeight}
              rx={4}
              className="fill-zinc-100 dark:fill-zinc-800"
            />
            <rect
              x={offsetX + i * (barWidth + gap)}
              y={chartHeight - barHeight}
              width={barWidth}
              height={Math.max(barHeight, 0)}
              rx={4}
              className="fill-blue-500 dark:fill-blue-400"
            />
            {value > 0 && (
              <text
                x={offsetX + i * (barWidth + gap) + barWidth / 2}
                y={chartHeight - barHeight - 4}
                textAnchor="middle"
                className="fill-zinc-700 dark:fill-zinc-300 text-[10px]"
                fontSize="10"
              >
                {Math.round(value * 100)}%
              </text>
            )}
            <text
              x={offsetX + i * (barWidth + gap) + barWidth / 2}
              y={chartHeight + labelHeight - 4}
              textAnchor="middle"
              className="fill-zinc-500 dark:fill-zinc-400 text-[9px]"
              fontSize="9"
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function HorizontalBarChart({ data }: { data: ExerciseCount[] }) {
  const chartHeight = data.length * 36;
  const chartWidth = 320;
  const labelWidth = 120;
  const barAreaWidth = chartWidth - labelWidth - 10;
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      className="w-full"
      role="img"
      aria-label="Most frequent exercises chart"
    >
      {data.map((item, i) => {
        const barWidth = (item.count / maxCount) * barAreaWidth;
        const y = i * 36;
        return (
          <g key={i}>
            <text
              x={labelWidth - 8}
              y={y + 22}
              textAnchor="end"
              className="fill-zinc-700 dark:fill-zinc-300 text-[11px]"
              fontSize="11"
            >
              {item.name.length > 16
                ? item.name.substring(0, 16) + "..."
                : item.name}
            </text>
            <rect
              x={labelWidth}
              y={y + 8}
              width={Math.max(barWidth, 0)}
              height={20}
              rx={4}
              className="fill-blue-500 dark:fill-blue-400"
            />
            <text
              x={labelWidth + barWidth + 6}
              y={y + 22}
              className="fill-zinc-500 dark:fill-zinc-400 text-[11px]"
              fontSize="11"
            >
              {item.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ProgressPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(
          "id, started_at, completed_at, session_exercises(id, name, completed, completed_at)"
        )
        .order("started_at", { ascending: false });

      if (!error && data) {
        setSessions(data as WorkoutSession[]);
      }
      setLoading(false);
    }

    fetchData();
  }, []);

  const completedSessions = sessions.filter((s) => s.completed_at !== null);

  const totalWorkouts = completedSessions.length;

  const totalExercises = sessions.reduce(
    (sum, s) => sum + s.session_exercises.filter((e) => e.completed).length,
    0
  );

  const now = new Date();
  const weekStart = getWeekStart(now);
  const thisWeekWorkouts = completedSessions.filter(
    (s) => new Date(s.completed_at!) >= weekStart
  ).length;

  const avgDuration = (() => {
    const durations = completedSessions
      .filter((s) => s.completed_at)
      .map((s) => {
        const start = new Date(s.started_at).getTime();
        const end = new Date(s.completed_at!).getTime();
        return (end - start) / 60000;
      })
      .filter((d) => d > 0 && d < 600);

    if (durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  })();

  const weeklyData = computeWeeklyData(sessions);
  const topExercises = computeTopExercises(sessions);
  const maxWorkouts = Math.max(...weeklyData.map((w) => w.workoutCount), 1);

  return (
    <div className="max-w-[480px] mx-auto px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-6 uppercase tracking-wide">Progress</h1>

      {loading && (
        <div className="text-zinc-500 dark:text-zinc-400 text-center py-12">
          Loading...
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-xl font-semibold mb-2">No data yet</p>
          <p className="text-zinc-500 dark:text-zinc-400">
            Complete some workouts to see your progress!
          </p>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <>
          <StreakCalendar sessions={sessions} />

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-1">
                Total Workouts
              </p>
              <p className="text-2xl font-bold text-blue-400">{totalWorkouts}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-1">
                Exercises Done
              </p>
              <p className="text-2xl font-bold text-blue-400">{totalExercises}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-1">
                This Week
              </p>
              <p className="text-2xl font-bold text-blue-400">{thisWeekWorkouts}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-1">
                Avg Duration
              </p>
              <p className="text-2xl font-bold text-blue-400">
                {avgDuration > 0 ? formatDuration(avgDuration) : "--"}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 mb-4">
            <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider">
              Workouts Per Week
            </h2>
            <BarChart
              data={weeklyData.map((w) => w.workoutCount)}
              labels={weeklyData.map((w) => w.label)}
              maxValue={maxWorkouts}
            />
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 mb-4">
            <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider">
              Completion Rate
            </h2>
            <CompletionChart
              data={weeklyData.map((w) => w.completionRate)}
              labels={weeklyData.map((w) => w.label)}
            />
          </div>

          {topExercises.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 mb-4">
              <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider">
                Most Frequent Exercises
              </h2>
              <HorizontalBarChart data={topExercises} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
