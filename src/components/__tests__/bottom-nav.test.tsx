import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BottomNav from "../bottom-nav";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

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

describe("BottomNav", () => {
  beforeEach(() => {
    mockPathname = "/";
  });

  it("renders 3 tabs: Today, Schedule, History", () => {
    render(<BottomNav />);

    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Schedule")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
  });

  it("links point to correct routes", () => {
    render(<BottomNav />);

    const todayLink = screen.getByText("Today").closest("a");
    const scheduleLink = screen.getByText("Schedule").closest("a");
    const historyLink = screen.getByText("History").closest("a");

    expect(todayLink).toHaveAttribute("href", "/");
    expect(scheduleLink).toHaveAttribute("href", "/schedule");
    expect(historyLink).toHaveAttribute("href", "/history");
  });

  it("highlights the active tab for root path", () => {
    mockPathname = "/";
    render(<BottomNav />);

    const todayLink = screen.getByText("Today").closest("a");
    const scheduleLink = screen.getByText("Schedule").closest("a");

    expect(todayLink?.className).toContain("text-blue-500");
    expect(scheduleLink?.className).toContain("text-zinc-500");
  });

  it("highlights the Schedule tab when on /schedule", () => {
    mockPathname = "/schedule";
    render(<BottomNav />);

    const todayLink = screen.getByText("Today").closest("a");
    const scheduleLink = screen.getByText("Schedule").closest("a");

    expect(todayLink?.className).toContain("text-zinc-500");
    expect(scheduleLink?.className).toContain("text-blue-500");
  });

  it("highlights the History tab when on /history", () => {
    mockPathname = "/history";
    render(<BottomNav />);

    const historyLink = screen.getByText("History").closest("a");
    const todayLink = screen.getByText("Today").closest("a");

    expect(historyLink?.className).toContain("text-blue-500");
    expect(todayLink?.className).toContain("text-zinc-500");
  });

  it("highlights Schedule tab for nested schedule routes", () => {
    mockPathname = "/schedule/edit";
    render(<BottomNav />);

    const scheduleLink = screen.getByText("Schedule").closest("a");
    expect(scheduleLink?.className).toContain("text-blue-500");
  });
});
