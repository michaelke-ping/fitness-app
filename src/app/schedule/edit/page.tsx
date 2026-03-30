"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface ExerciseRow {
  id?: string;
  name: string;
  sets: number;
  reps: string;
  sort_order: number;
  notes: string;
}

interface ScheduleData {
  id: string;
  name: string;
  day_of_week: number;
  sort_order: number;
  schedule_exercises: {
    id: string;
    name: string;
    sets: number;
    reps: string;
    sort_order: number;
    notes: string | null;
  }[];
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function ScheduleEditPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400 text-center py-12">Loading...</div>}>
      <ScheduleEditContent />
    </Suspense>
  );
}

function ScheduleEditContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeDay, setActiveDay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [originalExerciseIds, setOriginalExerciseIds] = useState<string[]>([]);

  const fetchSchedule = useCallback(async (day: number) => {
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("workout_schedules")
      .select(
        "id, name, day_of_week, sort_order, schedule_exercises(id, name, sets, reps, sort_order, notes)"
      )
      .eq("day_of_week", day)
      .single();

    if (error || !data) {
      setScheduleId(null);
      setWorkoutName("");
      setExercises([]);
      setOriginalExerciseIds([]);
    } else {
      const schedule = data as ScheduleData;
      setScheduleId(schedule.id);
      setWorkoutName(schedule.name);

      const sorted = [...schedule.schedule_exercises].sort(
        (a, b) => a.sort_order - b.sort_order
      );

      setExercises(
        sorted.map((e) => ({
          id: e.id,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          sort_order: e.sort_order,
          notes: e.notes ?? "",
        }))
      );
      setOriginalExerciseIds(sorted.map((e) => e.id));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const dayParam = searchParams.get("day");
    const day = dayParam !== null ? parseInt(dayParam, 10) : 0;
    const validDay = day >= 0 && day <= 6 ? day : 0;
    setActiveDay(validDay);
    fetchSchedule(validDay);
  }, [searchParams, fetchSchedule]);

  const handleDaySwitch = (day: number) => {
    setActiveDay(day);
    router.replace(`/schedule/edit?day=${day}`);
  };

  const updateExercise = (index: number, field: keyof ExerciseRow, value: string | number) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const addExercise = () => {
    setExercises((prev) => [
      ...prev,
      {
        name: "",
        sets: 3,
        reps: "10",
        sort_order: prev.length,
        notes: "",
      },
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const trimmedName = workoutName.trim();
      const validExercises = exercises.filter((e) => e.name.trim() !== "");

      // If no name and no exercises, delete the schedule (make it a rest day)
      if (!trimmedName && validExercises.length === 0) {
        if (scheduleId) {
          const { error } = await supabase
            .from("workout_schedules")
            .delete()
            .eq("id", scheduleId);

          if (error) throw error;
        }

        setScheduleId(null);
        setWorkoutName("");
        setExercises([]);
        setOriginalExerciseIds([]);
        setMessage({ type: "success", text: "Day cleared to rest day" });
        setSaving(false);
        return;
      }

      // Upsert the schedule
      let currentScheduleId = scheduleId;

      if (currentScheduleId) {
        const { error } = await supabase
          .from("workout_schedules")
          .update({ name: trimmedName, updated_at: new Date().toISOString() })
          .eq("id", currentScheduleId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("workout_schedules")
          .insert({
            day_of_week: activeDay,
            name: trimmedName,
            sort_order: activeDay,
          })
          .select("id")
          .single();

        if (error || !data) throw error ?? new Error("Failed to create schedule");
        currentScheduleId = data.id;
      }

      // Determine which exercises to delete
      const currentIds = validExercises.filter((e) => e.id).map((e) => e.id as string);
      const toDelete = originalExerciseIds.filter((id) => !currentIds.includes(id));

      if (toDelete.length > 0) {
        const { error } = await supabase
          .from("schedule_exercises")
          .delete()
          .in("id", toDelete);

        if (error) throw error;
      }

      // Upsert exercises
      for (let i = 0; i < validExercises.length; i++) {
        const ex = validExercises[i];
        const payload = {
          schedule_id: currentScheduleId,
          name: ex.name.trim(),
          sets: ex.sets,
          reps: ex.reps,
          sort_order: i,
          notes: ex.notes.trim() || null,
        };

        if (ex.id) {
          const { error } = await supabase
            .from("schedule_exercises")
            .update(payload)
            .eq("id", ex.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("schedule_exercises")
            .insert(payload);

          if (error) throw error;
        }
      }

      // Refetch to get proper IDs
      await fetchSchedule(activeDay);
      setMessage({ type: "success", text: "Changes saved" });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save";
      setMessage({ type: "error", text: errorMessage });
    }

    setSaving(false);
  };

  return (
    <div className="max-w-[480px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/schedule"
          className="text-zinc-400 hover:text-white transition-colors"
          aria-label="Back to schedule"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold">Edit {DAY_NAMES[activeDay]}</h1>
      </div>

      {/* Day selector */}
      <div className="flex justify-between gap-2 mb-6">
        {DAY_LABELS.map((label, index) => (
          <button
            key={index}
            onClick={() => handleDaySwitch(index)}
            className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
              index === activeDay
                ? "bg-white text-black"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-zinc-400 text-center py-12">Loading...</div>
      )}

      {!loading && (
        <div className="flex flex-col gap-4">
          {/* Workout name */}
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">
              Workout Name
            </label>
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="e.g. Push Day, Upper Body"
              className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 border border-zinc-700 focus:border-zinc-500 focus:outline-none placeholder:text-zinc-600"
            />
          </div>

          {/* Exercises */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">
              Exercises
            </label>

            <div className="flex flex-col gap-3">
              {exercises.map((exercise, index) => (
                <div
                  key={index}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={exercise.name}
                        onChange={(e) =>
                          updateExercise(index, "name", e.target.value)
                        }
                        placeholder="Exercise name"
                        className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:border-zinc-500 focus:outline-none placeholder:text-zinc-600"
                      />
                    </div>
                    <button
                      onClick={() => removeExercise(index)}
                      className="text-red-400/60 hover:text-red-400 transition-colors p-1 mt-0.5 shrink-0"
                      aria-label="Remove exercise"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <div className="w-20">
                      <label className="text-xs text-zinc-500 mb-0.5 block">
                        Sets
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={exercise.sets}
                        onChange={(e) =>
                          updateExercise(
                            index,
                            "sets",
                            parseInt(e.target.value, 10) || 1
                          )
                        }
                        className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:border-zinc-500 focus:outline-none"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-zinc-500 mb-0.5 block">
                        Reps
                      </label>
                      <input
                        type="text"
                        value={exercise.reps}
                        onChange={(e) =>
                          updateExercise(index, "reps", e.target.value)
                        }
                        placeholder="8-12"
                        className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:border-zinc-500 focus:outline-none placeholder:text-zinc-600"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-xs text-zinc-500 mb-0.5 block">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={exercise.notes}
                        onChange={(e) =>
                          updateExercise(index, "notes", e.target.value)
                        }
                        placeholder="Optional"
                        className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:border-zinc-500 focus:outline-none placeholder:text-zinc-600"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Exercise button */}
            <button
              onClick={addExercise}
              className="w-full mt-3 py-3 border-2 border-dashed border-zinc-700 rounded-lg text-zinc-400 text-sm font-medium hover:border-zinc-500 hover:text-zinc-300 transition-colors"
            >
              + Add Exercise
            </button>
          </div>

          {/* Message */}
          {message && (
            <p
              className={`text-sm text-center ${
                message.type === "success" ? "text-green-400" : "text-red-400"
              }`}
            >
              {message.text}
            </p>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-white text-black font-semibold py-3 rounded-lg text-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
