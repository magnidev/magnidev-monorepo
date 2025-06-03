import { vi, beforeEach } from "vitest";

// Global setup for all tests
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();

  // Reset environment variables
  vi.unstubAllEnvs();

  // Mock console methods to avoid noise in test output
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// Mock process.exit globally to prevent tests from actually exiting
vi.stubGlobal("process", {
  ...process,
  exit: vi.fn(),
  cwd: vi.fn(() => "/test/project"),
});

// Global test utilities
export const mockProcessExit = () => {
  const originalExit = process.exit;
  const exitMock = vi.fn();
  process.exit = exitMock as any;

  return {
    exitMock,
    restore: () => {
      process.exit = originalExit;
    },
  };
};

export const mockConsole = () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  const logMock = vi.fn();
  const warnMock = vi.fn();
  const errorMock = vi.fn();

  console.log = logMock;
  console.warn = warnMock;
  console.error = errorMock;

  return {
    logMock,
    warnMock,
    errorMock,
    restore: () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    },
  };
};
