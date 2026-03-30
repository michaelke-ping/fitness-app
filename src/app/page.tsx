"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  sort_order: number;
  notes: string | null;
}

interface WorkoutSchedule {
  id: string;
  name: string;
  day_of_week: number;
  schedule_exercises: Exercise[];
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

export default function Home() {
  const [schedule, setSchedule] = useState<WorkoutSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [dayName, setDayName] = useState("");
  const [hasActiveSession, setHasActiveSession] = useState(false);

  useEffect(() => {
    const today = new Date().getDay();
    setDayName(DAY_NAMES[today]);

    async function fetchTodayWorkout() {
      const { data, error } = await supabase
        .from("workout_schedules")
        .select("id, name, day_of_week, schedule_exercises(id, name, sets, reps, sort_order, notes)")
        .eq("day_of_week", today)
        .single();

      if (!error && data) {
        const sorted = {
          ...data,
          schedule_exercises: [...data.schedule_exercises].sort(
            (a: Exercise, b: Exercise) => a.sort_order - b.sort_order
          ),
        };
        setSchedule(sorted);

        const { data: activeSession } = await supabase
          .from("workout_sessions")
          .select("id")
          .eq("schedule_id", data.id)
          .is("completed_at", null)
          .limit(1)
          .single();

        if (activeSession) {
          setHasActiveSession(true);
        }
      }

      setLoading(false);
    }

    fetchTodayWorkout();
  }, []);

  return (
    <div className="max-w-[480px] mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Today&apos;s Workout</h1>
        <p className="text-zinc-400 text-lg">{dayName}</p>
      </div>

      {loading && (
        <div className="text-zinc-400 text-center py-12">Loading...</div>
      )}

      {!loading && !schedule && (
        <div className="text-center py-12">
          <p className="text-xl font-semibold mb-2">Rest Day</p>
          <p className="text-zinc-400">No workout scheduled for today. Recover and come back stronger.</p>
        </div>
      )}

      {!loading && schedule && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">{schedule.name}</h2>
            <p className="text-zinc-400 text-sm">
              {schedule.schedule_exercises.length} exercise
              {schedule.schedule_exercises.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex flex-col gap-3 mb-8">
            {schedule.schedule_exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <p className="font-medium text-lg">{exercise.name}</p>
                  <p className="text-zinc-400 text-sm whitespace-nowrap ml-4">
                    {exercise.sets} x {exercise.reps}
                  </p>
                </div>
                {exercise.notes && (() => {
                  const [desc, url] = exercise.notes.split('|||');
                  return (
                    <div className="mt-2">
                      {desc && <p className="text-zinc-500 text-sm">{desc.trim()}</p>}
                      {url && (
                        <a
                          href={url.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 text-sm mt-1 inline-block hover:underline"
                        >
                          How to do this exercise &rarr;
                        </a>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>

          <Link
            href={`/workout/${schedule.id}`}
            className="block w-full text-center bg-white text-black font-semibold py-4 rounded-lg text-lg hover:bg-zinc-200 transition-colors"
          >
            {hasActiveSession ? "Resume Workout" : "Start Workout"}
          </Link>
        </>
      )}
    </div>
  );
}
