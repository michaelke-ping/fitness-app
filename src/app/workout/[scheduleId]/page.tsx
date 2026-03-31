"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface SessionExercise {
  id: string;
  session_id: string;
  exercise_id: string;
  name: string;
  sets: number;
  reps: string;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
}

interface WorkoutSession {
  id: string;
  schedule_id: string;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
}

export default function WorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = params.scheduleId as string;

  const [workoutName, setWorkoutName] = useState("");
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState("00:00");
  const [finishing, setFinishing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rest timer state
  const [restSeconds, setRestSeconds] = useState(0);
  const [restTotal, setRestTotal] = useState(90);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearRestTimer = useCallback(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    setRestSeconds(0);
  }, []);

  const startRestTimer = useCallback((duration: number) => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setRestTotal(duration);
    setRestSeconds(duration);
    restTimerRef.current = setInterval(() => {
      setRestSeconds((prev) => {
        if (prev <= 1) {
          if (restTimerRef.current) {
            clearInterval(restTimerRef.current);
            restTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startTimer = useCallback((startedAt: string) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const update = () => {
      const diff = Math.floor(
        (Date.now() - new Date(startedAt).getTime()) / 1000
      );
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setElapsed(
        `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      );
    };

    update();
    timerRef.current = setInterval(update, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, []);

  useEffect(() => {
    async function init() {
      const { data: schedule } = await supabase
        .from("workout_schedules")
        .select("id, name")
        .eq("id", scheduleId)
        .single();

      if (!schedule) {
        setLoading(false);
        return;
      }

      setWorkoutName(schedule.name);

      const { data: existingSession } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("schedule_id", scheduleId)
        .is("completed_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (existingSession) {
        setSession(existingSession);
        startTimer(existingSession.started_at);

        const { data: sessionExercises } = await supabase
          .from("session_exercises")
          .select("*")
          .eq("session_id", existingSession.id)
          .order("sort_order", { ascending: true });

        if (sessionExercises) {
          setExercises(sessionExercises);
        }
      } else {
        const { data: newSession, error: sessionError } = await supabase
          .from("workout_sessions")
          .insert({ schedule_id: scheduleId })
          .select()
          .single();

        if (sessionError || !newSession) {
          setLoading(false);
          return;
        }

        setSession(newSession);
        startTimer(newSession.started_at);

        const { data: scheduleExercises } = await supabase
          .from("schedule_exercises")
          .select("id, name, sets, reps, sort_order")
          .eq("schedule_id", scheduleId)
          .order("sort_order", { ascending: true });

        if (scheduleExercises && scheduleExercises.length > 0) {
          const rows = scheduleExercises.map((ex) => ({
            session_id: newSession.id,
            exercise_id: ex.id,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            sort_order: ex.sort_order,
          }));

          const { data: inserted } = await supabase
            .from("session_exercises")
            .insert(rows)
            .select();

          if (inserted) {
            setExercises(inserted);
          }
        }
      }

      setLoading(false);
    }

    init();
  }, [scheduleId, startTimer]);

  async function toggleExercise(exercise: SessionExercise) {
    const nowCompleted = !exercise.completed;
    const completedAt = nowCompleted ? new Date().toISOString() : null;

    setExercises((prev) => {
      const updated = prev.map((ex) =>
        ex.id === exercise.id
          ? { ...ex, completed: nowCompleted, completed_at: completedAt }
          : ex
      );

      // Start rest timer when completing an exercise, but not for the last one
      if (nowCompleted) {
        const allCompleted = updated.every((ex) => ex.completed);
        if (!allCompleted) {
          startRestTimer(90);
        } else {
          clearRestTimer();
        }
      }

      return updated;
    });

    const { error } = await supabase
      .from("session_exercises")
      .update({ completed: nowCompleted, completed_at: completedAt })
      .eq("id", exercise.id);

    if (error) {
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exercise.id
            ? { ...ex, completed: exercise.completed, completed_at: exercise.completed_at }
            : ex
        )
      );
    }
  }

  async function finishWorkout() {
    if (!session || finishing) return;
    setFinishing(true);

    const { error } = await supabase
      .from("workout_sessions")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", session.id);

    if (!error) {
      if (timerRef.current) clearInterval(timerRef.current);
      router.push("/");
    } else {
      setFinishing(false);
    }
  }

  const completedCount = exercises.filter((ex) => ex.completed).length;

  if (loading) {
    return (
      <div className="max-w-[480px] mx-auto px-4 py-6">
        <div className="text-zinc-500 dark:text-zinc-400 text-center py-12">Loading workout...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-[480px] mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-xl font-semibold mb-2">Workout not found</p>
          <button
            onClick={() => router.push("/")}
            className="text-zinc-500 dark:text-zinc-400 underline mt-4"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[480px] mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold uppercase tracking-wide">{workoutName}</h1>
        <span className="text-blue-400 font-mono text-lg tabular-nums">
          {elapsed}
        </span>
      </div>

      <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
        {completedCount}/{exercises.length} exercises completed
      </p>

      <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 mb-6">
        <div
          className="bg-blue-500 h-2 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.4)] transition-all duration-300"
          style={{
            width:
              exercises.length > 0
                ? `${(completedCount / exercises.length) * 100}%`
                : "0%",
          }}
        />
      </div>

      {restSeconds > 0 && (
        <div className="mb-4 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-zinc-500 dark:text-zinc-400 text-sm font-medium uppercase tracking-wide">
              Rest Timer
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setRestSeconds((prev) => {
                    const newVal = prev + 30;
                    setRestTotal((t) => t + 30);
                    return newVal;
                  });
                }}
                className="px-3 py-1 text-xs font-medium bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded transition-colors"
              >
                +30s
              </button>
              <button
                type="button"
                onClick={clearRestTimer}
                className="px-3 py-1 text-xs font-medium bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
          <p
            className={`text-4xl font-bold font-mono tabular-nums text-center mb-3 transition-colors ${
              restSeconds <= 5 ? "text-red-400 animate-pulse" : "text-zinc-900 dark:text-white"
            }`}
          >
            {Math.floor(restSeconds / 60)}:{(restSeconds % 60).toString().padStart(2, "0")}
          </p>
          <div className="w-full bg-zinc-300 dark:bg-zinc-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-1000 linear ${
                restSeconds <= 5 ? "bg-red-500" : "bg-green-500"
              }`}
              style={{
                width: `${(restSeconds / restTotal) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 mb-8">
        {exercises.map((exercise) => (
          <button
            key={exercise.id}
            type="button"
            onClick={() => toggleExercise(exercise)}
            className={`w-full text-left bg-white dark:bg-zinc-900 border rounded-lg p-4 transition-colors ${
              exercise.completed
                ? "border-green-900/50"
                : "border-zinc-200 dark:border-zinc-800 active:border-zinc-400 dark:active:border-zinc-600"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                  exercise.completed
                    ? "bg-green-500 border-green-500"
                    : "border-zinc-300 dark:border-zinc-600"
                }`}
              >
                {exercise.completed && (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium text-lg ${
                    exercise.completed ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-white"
                  }`}
                >
                  {exercise.name}
                </p>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  {exercise.sets} x {exercise.reps}
                </p>
                {exercise.completed && exercise.completed_at && (
                  <p className="text-zinc-400 dark:text-zinc-600 text-xs mt-1">
                    Completed at{" "}
                    {new Date(exercise.completed_at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={finishWorkout}
        disabled={finishing}
        className="block w-full text-center bg-black dark:bg-white text-white dark:text-black font-semibold py-4 rounded-lg text-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
      >
        {finishing ? "Finishing..." : "Finish Workout"}
      </button>
    </div>
  );
}
