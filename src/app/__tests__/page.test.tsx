import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { setMockResult, resetMockResult, supabase } from "@/lib/supabase";
import Home from "../page";

vi.mock("@/lib/supabase");

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

describe("Home page", () => {
  beforeEach(() => {
    resetMockResult();
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    // Make supabase never resolve so we stay in loading
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockReturnValue(new Promise(() => {})),
          then: () => new Promise(() => {}),
        }),
        then: () => new Promise(() => {}),
      }),
      then: () => new Promise(() => {}),
    } as never);

    render(<Home />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it('shows "Rest Day" message when no schedule exists for today', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: null, error: { message: "not found" } }),
        }),
      }),
    } as never);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Rest Day")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "No workout scheduled for today. Recover and come back stronger."
      )
    ).toBeInTheDocument();
  });

  it("shows workout name and exercises when schedule exists", async () => {
    // First call: workout_schedules
    const scheduleData = {
      id: "sched-1",
      name: "Upper Body",
      day_of_week: 1,
      schedule_exercises: [
        {
          id: "ex-1",
          name: "Bench Press",
          sets: 3,
          reps: "10",
          sort_order: 1,
          notes: null,
        },
        {
          id: "ex-2",
          name: "Overhead Press",
          sets: 3,
          reps: "8",
          sort_order: 2,
          notes: null,
        },
      ],
    };

    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // workout_schedules call
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: scheduleData, error: null }),
            }),
          }),
        } as never;
      }
      // workout_sessions call (no active session)
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: null, error: { message: "not found" } }),
              }),
            }),
          }),
        }),
      } as never;
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Upper Body")).toBeInTheDocument();
    });

    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("Overhead Press")).toBeInTheDocument();
    expect(screen.getByText("2 exercises")).toBeInTheDocument();
  });

  it('shows exercise descriptions and "How to" links when notes contain ||| separator', async () => {
    const scheduleData = {
      id: "sched-1",
      name: "Leg Day",
      day_of_week: 1,
      schedule_exercises: [
        {
          id: "ex-1",
          name: "Squat",
          sets: 4,
          reps: "8",
          sort_order: 1,
          notes: "Keep back straight|||https://example.com/squat",
        },
      ],
    };

    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: scheduleData, error: null }),
            }),
          }),
        } as never;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: null, error: { message: "not found" } }),
              }),
            }),
          }),
        }),
      } as never;
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Keep back straight")).toBeInTheDocument();
    });

    const howToLink = screen.getByText(/How to do this exercise/);
    expect(howToLink).toBeInTheDocument();
    expect(howToLink).toHaveAttribute("href", "https://example.com/squat");
    expect(howToLink).toHaveAttribute("target", "_blank");
  });

  it('"Start Workout" button links to correct URL', async () => {
    const scheduleData = {
      id: "sched-abc",
      name: "Push",
      day_of_week: 1,
      schedule_exercises: [
        {
          id: "ex-1",
          name: "Pushups",
          sets: 3,
          reps: "15",
          sort_order: 1,
          notes: null,
        },
      ],
    };

    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: scheduleData, error: null }),
            }),
          }),
        } as never;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: null, error: { message: "not found" } }),
              }),
            }),
          }),
        }),
      } as never;
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Start Workout")).toBeInTheDocument();
    });

    const link = screen.getByText("Start Workout").closest("a");
    expect(link).toHaveAttribute("href", "/workout/sched-abc");
  });

  it('shows "Resume Workout" when an active session exists', async () => {
    const scheduleData = {
      id: "sched-1",
      name: "Pull",
      day_of_week: 1,
      schedule_exercises: [
        {
          id: "ex-1",
          name: "Pull-ups",
          sets: 3,
          reps: "8",
          sort_order: 1,
          notes: null,
        },
      ],
    };

    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: scheduleData, error: null }),
            }),
          }),
        } as never;
      }
      // Active session exists
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "session-1" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as never;
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Resume Workout")).toBeInTheDocument();
    });
  });
});
