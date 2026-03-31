"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Exercise {
  id: string;
  name: string;
}

interface WorkoutSchedule {
  id: string;
  name: string;
  day_of_week: number;
  sort_order: number;
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

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<WorkoutSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSchedules() {
      const { data, error } = await supabase
        .from("workout_schedules")
        .select("id, name, day_of_week, sort_order, schedule_exercises(id, name)")
        .order("sort_order", { ascending: true });

      if (!error && data) {
        setSchedules(data);
      }

      setLoading(false);
    }

    fetchSchedules();
  }, []);

  const getScheduleForDay = (dayIndex: number) => {
    return schedules.find((s) => s.day_of_week === dayIndex);
  };

  const today = new Date().getDay();

  return (
    <div className="max-w-[480px] mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 uppercase tracking-wide">Weekly Schedule</h1>

      {loading && (
        <div className="text-zinc-500 dark:text-zinc-400 text-center py-12">Loading...</div>
      )}

      {!loading && (
        <div className="flex flex-col gap-3">
          {DAY_NAMES.map((dayName, index) => {
            const schedule = getScheduleForDay(index);
            const isToday = index === today;

            return (
              <Link
                key={index}
                href={`/schedule/edit?day=${index}`}
                className={`block bg-white dark:bg-zinc-900 border rounded-lg p-4 ${
                  isToday ? "border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)]" : "border-zinc-200 dark:border-zinc-800"
                } hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className={`font-medium text-lg ${isToday ? "text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300"}`}>
                      {dayName}
                      {isToday && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">TODAY</span>
                      )}
                    </p>
                    {schedule ? (
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                        {schedule.name}
                      </p>
                    ) : (
                      <p className="text-zinc-400 dark:text-zinc-600 text-sm mt-1">Rest Day</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {schedule && (
                      <p className="text-zinc-400 dark:text-zinc-500 text-sm">
                        {schedule.schedule_exercises.length} exercise
                        {schedule.schedule_exercises.length !== 1 ? "s" : ""}
                      </p>
                    )}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-zinc-400 dark:text-zinc-600"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
