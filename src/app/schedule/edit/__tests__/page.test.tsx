import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { supabase } from "@/lib/supabase";
import ScheduleEditPage from "../page";

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

const stableSearchParams = new URLSearchParams("day=1");

vi.mock("next/navigation", () => ({
  usePathname: () => "/schedule/edit",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  useSearchParams: () => stableSearchParams,
}));

const mockSchedule = {
  id: "s1",
  name: "Push Day",
  day_of_week: 1,
  sort_order: 1,
  schedule_exercises: [
    { id: "e1", name: "Bench Press", sets: 3, reps: "8-12", sort_order: 0, notes: null },
    { id: "e2", name: "Shoulder Press", sets: 3, reps: "10", sort_order: 1, notes: "strict form" },
  ],
};

function createFromChain(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  } as never;
}

function setupMock(data: unknown, error: unknown = null) {
  vi.mocked(supabase.from).mockImplementation(() => createFromChain(data, error));
}

function setupEmptyMock() {
  setupMock(null, { code: "PGRST116", message: "not found" });
}

async function renderAndWait() {
  render(<ScheduleEditPage />);
  await waitFor(() => {
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });
}

describe("ScheduleEditPage - Copy to Day", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show Copy to button when there is no workout", async () => {
    setupEmptyMock();
    await renderAndWait();

    expect(screen.queryByText("Copy to...")).not.toBeInTheDocument();
  });

  it("shows Copy to button when workout has a name and exercises", async () => {
    setupMock(mockSchedule);
    await renderAndWait();

    expect(screen.getByText("Copy to...")).toBeInTheDocument();
  });

  it("opens the copy modal when clicking Copy to button", async () => {
    setupMock(mockSchedule);
    await renderAndWait();

    const user = userEvent.setup();
    await user.click(screen.getByText("Copy to..."));

    expect(screen.getByText("Copy to Day")).toBeInTheDocument();
    expect(screen.getByText(/Copy "Push Day" and 2 exercises to:/)).toBeInTheDocument();
  });

  it("excludes the current day from the modal day selector", async () => {
    setupMock(mockSchedule);
    await renderAndWait();

    const user = userEvent.setup();
    await user.click(screen.getByText("Copy to..."));

    const modal = screen.getByText("Copy to Day").closest("div.bg-white, div.dark\\:bg-zinc-900")!.parentElement!;
    const dayButtons = modal.querySelectorAll("button");
    const dayLabels = Array.from(dayButtons)
      .filter((btn) => btn.textContent?.match(/^[SMTWF]$/))
      .map((btn) => btn.textContent);

    expect(dayLabels).toHaveLength(6);
  });

  it("closes the modal when Cancel is clicked", async () => {
    setupMock(mockSchedule);
    await renderAndWait();

    const user = userEvent.setup();
    await user.click(screen.getByText("Copy to..."));
    expect(screen.getByText("Copy to Day")).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Copy to Day")).not.toBeInTheDocument();
  });

  it("shows overwrite confirmation when selecting a day with existing workout", async () => {
    setupMock(mockSchedule);
    await renderAndWait();

    const user = userEvent.setup();
    await user.click(screen.getByText("Copy to..."));

    vi.mocked(supabase.from).mockImplementationOnce(() => {
      const chain = { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
      chain.select.mockReturnValue(chain);
      chain.eq.mockReturnValue(chain);
      chain.single.mockResolvedValue({ data: { id: "existing-id" }, error: null });
      return chain as never;
    });

    const modal = screen.getByText("Copy to Day").closest("div")!.parentElement!;
    const wButtons = Array.from(modal.querySelectorAll("button")).filter(
      (btn) => btn.textContent === "W"
    );
    await user.click(wButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Overwrite Wednesday?")).toBeInTheDocument();
    });
  });

  it("overwrite confirmation shows the target day name", async () => {
    setupMock(mockSchedule);
    await renderAndWait();

    const user = userEvent.setup();
    await user.click(screen.getByText("Copy to..."));

    vi.mocked(supabase.from).mockImplementationOnce(() => {
      const chain = { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
      chain.select.mockReturnValue(chain);
      chain.eq.mockReturnValue(chain);
      chain.single.mockResolvedValue({ data: { id: "existing-id" }, error: null });
      return chain as never;
    });

    const modal = screen.getByText("Copy to Day").closest("div")!.parentElement!;
    const fButtons = Array.from(modal.querySelectorAll("button")).filter(
      (btn) => btn.textContent === "F"
    );
    await user.click(fButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Overwrite Friday?")).toBeInTheDocument();
      expect(
        screen.getByText(/Friday already has a workout/)
      ).toBeInTheDocument();
    });
  });
});
