import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { supabase } from "@/lib/supabase";
import SchedulePage from "../page";

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
  usePathname: () => "/schedule",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

const mockSchedules = [
  {
    id: "s1",
    name: "Push Day",
    day_of_week: 1,
    sort_order: 1,
    schedule_exercises: [
      { id: "e1", name: "Bench Press" },
      { id: "e2", name: "Shoulder Press" },
    ],
  },
  {
    id: "s2",
    name: "Pull Day",
    day_of_week: 3,
    sort_order: 2,
    schedule_exercises: [{ id: "e3", name: "Pull-ups" }],
  },
  {
    id: "s3",
    name: "Leg Day",
    day_of_week: 5,
    sort_order: 3,
    schedule_exercises: [
      { id: "e4", name: "Squat" },
      { id: "e5", name: "Lunges" },
      { id: "e6", name: "Calf Raises" },
    ],
  },
];

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

describe("SchedulePage", () => {
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

    render(<SchedulePage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders all 7 days of the week", async () => {
    setupMock(mockSchedules);

    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    for (const day of dayNames) {
      expect(screen.getByText(day)).toBeInTheDocument();
    }
  });

  it("shows workout names for days that have schedules", async () => {
    setupMock(mockSchedules);

    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.getByText("Push Day")).toBeInTheDocument();
    });

    expect(screen.getByText("Pull Day")).toBeInTheDocument();
    expect(screen.getByText("Leg Day")).toBeInTheDocument();
  });

  it("shows Rest Day for days without a schedule", async () => {
    setupMock(mockSchedules);

    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    // Days 0, 2, 4, 6 have no schedule -> "Rest Day" text
    const restDays = screen.getAllByText("Rest Day");
    expect(restDays.length).toBe(4);
  });

  it("highlights today's card", async () => {
    setupMock(mockSchedules);

    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("TODAY")).toBeInTheDocument();
  });

  it("each day links to the edit page", async () => {
    setupMock(mockSchedules);

    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    const links = screen.getAllByRole("link");
    expect(links.length).toBe(7);

    for (let i = 0; i < 7; i++) {
      expect(links[i]).toHaveAttribute("href", `/schedule/edit?day=${i}`);
    }
  });

  it("shows exercise counts for scheduled days", async () => {
    setupMock(mockSchedules);

    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.getByText("Push Day")).toBeInTheDocument();
    });

    expect(screen.getByText("2 exercises")).toBeInTheDocument();
    expect(screen.getByText("1 exercise")).toBeInTheDocument();
    expect(screen.getByText("3 exercises")).toBeInTheDocument();
  });
});
