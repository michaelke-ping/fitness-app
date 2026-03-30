"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface SessionExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
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

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(
          "id, schedule_id, started_at, completed_at, notes, workout_schedules(name), session_exercises(id, name, sets, reps, completed, completed_at, sort_order)"
        )
        .eq("id", sessionId)
        .single();

      if (!error && data) {
        const sorted = {
          ...data,
          session_exercises: [...data.session_exercises].sort(
            (a: SessionExercise, b: SessionExercise) =>
              a.sort_order - b.sort_order
          ),
        } as WorkoutSession;
        setSession(sorted);
      }

      setLoading(false);
    }

    fetchSession();
  }, [sessionId]);

  return (
    <div className="max-w-[480px] mx-auto px-4 py-6">
      <Link
        href="/history"
        className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors mb-6"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to History
      </Link>

      {loading && (
        <div className="text-zinc-500 dark:text-zinc-400 text-center py-12">Loading...</div>
      )}

      {!loading && !session && (
        <div className="text-center py-12">
          <p className="text-xl font-semibold mb-2">Session not found</p>
          <p className="text-zinc-500 dark:text-zinc-400">
            This workout session could not be found.
          </p>
        </div>
      )}

      {!loading && session && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold">
              {getScheduleName(session.workout_schedules)}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg">
              {formatDate(session.started_at)}
            </p>

            <div className="flex items-center gap-3 mt-3">
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  session.completed_at
                    ? "bg-green-400/10 text-green-400"
                    : "bg-yellow-400/10 text-yellow-400"
                }`}
              >
                {session.completed_at ? "Completed" : "In Progress"}
              </span>

              {session.completed_at && (
                <span className="text-zinc-500 dark:text-zinc-400 text-sm">
                  {formatDuration(session.started_at, session.completed_at)}
                </span>
              )}
            </div>
          </div>

          {session.notes && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 mb-6">
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">{session.notes}</p>
            </div>
          )}

          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              Exercises ({session.session_exercises.length})
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {session.session_exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {exercise.completed ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5 text-green-400"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5 text-zinc-400 dark:text-zinc-600"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p
                        className={`font-medium text-lg ${
                          exercise.completed ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        {exercise.name}
                      </p>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm whitespace-nowrap ml-4">
                        {exercise.sets} x {exercise.reps}
                      </p>
                    </div>

                    {exercise.completed && exercise.completed_at && (
                      <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1">
                        Completed at {formatTime(exercise.completed_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
