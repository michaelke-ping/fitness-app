"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface SessionExercise {
  id: string;
  completed: boolean;
}

interface WorkoutSchedule {
  name: string;
}

interface WorkoutSession {
  id: string;
  schedule_id: string | null;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  workout_schedules: WorkoutSchedule | WorkoutSchedule[] | null;
  session_exercises: SessionExercise[];
}

function formatDuration(startedAt: string, completedAt: string): string {
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const totalMinutes = Math.round((end - start) / 60000);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function getScheduleName(
  ws: WorkoutSchedule | WorkoutSchedule[] | null
): string {
  if (!ws) return "Unknown";
  if (Array.isArray(ws)) return ws.length > 0 ? ws[0].name : "Unknown";
  return ws.name;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(
          "id, schedule_id, started_at, completed_at, notes, workout_schedules(name), session_exercises(id, completed)"
        )
        .order("started_at", { ascending: false });

      if (!error && data) {
        setSessions(data as WorkoutSession[]);
      }

      setLoading(false);
    }

    fetchSessions();
  }, []);

  return (
    <div className="max-w-[480px] mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 uppercase tracking-wide">Workout History</h1>

      {loading && (
        <div className="text-zinc-500 dark:text-zinc-400 text-center py-12">Loading...</div>
      )}

      {!loading && sessions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-xl font-semibold mb-2">No workouts yet</p>
          <p className="text-zinc-500 dark:text-zinc-400">
            Start your first workout from the Today tab!
          </p>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="flex flex-col gap-3">
          {sessions.map((session) => {
            const totalExercises = session.session_exercises.length;
            const completedExercises = session.session_exercises.filter(
              (e) => e.completed
            ).length;
            const isCompleted = session.completed_at !== null;

            return (
              <Link
                key={session.id}
                href={`/history/${session.id}`}
                className="block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-lg">
                      {getScheduleName(session.workout_schedules)}
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                      {formatDate(session.started_at)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      isCompleted
                        ? "bg-green-400/10 text-green-400"
                        : "bg-yellow-400/10 text-yellow-400"
                    }`}
                  >
                    {isCompleted ? "Completed" : "In Progress"}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                  {totalExercises > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-400 rounded-full transition-all"
                          style={{
                            width: `${
                              totalExercises > 0
                                ? (completedExercises / totalExercises) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span>
                        {completedExercises}/{totalExercises} exercises
                      </span>
                    </div>
                  )}

                  {isCompleted && session.completed_at && (
                    <span>
                      {formatDuration(session.started_at, session.completed_at)}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
