import { vi } from "vitest";

interface MockResult {
  data: unknown;
  error: unknown;
}

let mockResult: MockResult = { data: null, error: null };

export function setMockResult(result: MockResult) {
  mockResult = result;
}

export function resetMockResult() {
  mockResult = { data: null, error: null };
}

function createChain(): Record<string, unknown> {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};

  const chainable = [
    "from",
    "select",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "like",
    "ilike",
    "is",
    "in",
    "order",
    "limit",
    "range",
    "match",
    "filter",
  ];

  const terminal = ["single", "maybeSingle"];

  for (const method of chainable) {
    chain[method] = vi.fn(() => chain);
  }

  for (const method of terminal) {
    chain[method] = vi.fn(() => Promise.resolve(mockResult));
  }

  // select can also be terminal (when no .single() is called)
  // Make the chain itself thenable so `await supabase.from(...).select(...).order(...)` works
  chain.then = (resolve: (value: MockResult) => void) => {
    return Promise.resolve(mockResult).then(resolve);
  };

  return chain;
}

export const supabase = {
  from: vi.fn(() => createChain()),
};
