import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { supabase } from "@/lib/supabase";
import HistoryPage from "../page";

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
  usePathname: () => "/history",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

function setupMock(data: unknown[] | null, error: unknown = null) {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        then: (resolve: (value: { data: unknown; error: unknown }) => void) =>
          Promise.resolve({ data, error }).then(resolve),
      }),
    }),
  } as never);
}

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state", () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          then: () => new Promise(() => {}),
        }),
      }),
    } as never);

    render(<HistoryPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows empty state when no sessions exist", async () => {
    setupMock([]);

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("No workouts yet")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Start your first workout from the Today tab!")
    ).toBeInTheDocument();
  });

  it("lists past workout sessions with date and name", async () => {
    const sessions = [
      {
        id: "sess-1",
        schedule_id: "s1",
        started_at: "2026-03-28T10:00:00Z",
        completed_at: "2026-03-28T11:00:00Z",
        notes: null,
        workout_schedules: { name: "Push Day" },
        session_exercises: [
          { id: "se1", completed: true },
          { id: "se2", completed: true },
        ],
      },
      {
        id: "sess-2",
        schedule_id: "s2",
        started_at: "2026-03-27T09:00:00Z",
        completed_at: null,
        notes: null,
        workout_schedules: { name: "Pull Day" },
        session_exercises: [
          { id: "se3", completed: true },
          { id: "se4", completed: false },
        ],
      },
    ];

    setupMock(sessions);

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Push Day")).toBeInTheDocument();
    });

    expect(screen.getByText("Pull Day")).toBeInTheDocument();
    // Check dates are formatted
    expect(screen.getByText(/Sat, Mar 28/)).toBeInTheDocument();
    expect(screen.getByText(/Fri, Mar 27/)).toBeInTheDocument();
  });

  it("shows completion stats", async () => {
    const sessions = [
      {
        id: "sess-1",
        schedule_id: "s1",
        started_at: "2026-03-28T10:00:00Z",
        completed_at: "2026-03-28T11:30:00Z",
        notes: null,
        workout_schedules: { name: "Leg Day" },
        session_exercises: [
          { id: "se1", completed: true },
          { id: "se2", completed: true },
          { id: "se3", completed: false },
        ],
      },
    ];

    setupMock(sessions);

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Leg Day")).toBeInTheDocument();
    });

    expect(screen.getByText("2/3 exercises")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("1h 30m")).toBeInTheDocument();
  });

  it('shows "In Progress" for sessions without completed_at', async () => {
    const sessions = [
      {
        id: "sess-1",
        schedule_id: "s1",
        started_at: "2026-03-28T10:00:00Z",
        completed_at: null,
        notes: null,
        workout_schedules: { name: "Push Day" },
        session_exercises: [
          { id: "se1", completed: true },
          { id: "se2", completed: false },
        ],
      },
    ];

    setupMock(sessions);

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });

    expect(screen.getByText("1/2 exercises")).toBeInTheDocument();
  });

  it("links each session to its detail page", async () => {
    const sessions = [
      {
        id: "sess-abc",
        schedule_id: "s1",
        started_at: "2026-03-28T10:00:00Z",
        completed_at: "2026-03-28T11:00:00Z",
        notes: null,
        workout_schedules: { name: "Upper Body" },
        session_exercises: [{ id: "se1", completed: true }],
      },
    ];

    setupMock(sessions);

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Upper Body")).toBeInTheDocument();
    });

    const link = screen.getByText("Upper Body").closest("a");
    expect(link).toHaveAttribute("href", "/history/sess-abc");
  });
});
