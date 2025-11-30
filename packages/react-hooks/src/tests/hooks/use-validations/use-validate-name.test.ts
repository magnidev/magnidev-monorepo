import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useValidateName } from "../../../hooks/use-validations";

describe("useValidateName", () => {
  it("should return valid result for valid names", () => {
    const validNames = [
      "John Doe",
      "Jane Smith",
      "Mary Jane Watson",
      "Al",
      "Christopher Alexander",
    ];

    for (const name of validNames) {
      const { result } = renderHook(() => useValidateName(name));

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
    }
  });

  it("should return invalid result for names that are too short", () => {
    const shortNames = ["A", "B"];

    for (const name of shortNames) {
      const { result } = renderHook(() => useValidateName(name));

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toContain("Must be at least 2 characters");
    }
  });

  it("should return invalid result for names that are too long", () => {
    const longName = "A".repeat(101);
    const { result } = renderHook(() => useValidateName(longName));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain("Must be at most 100 characters");
  });

  it("should return invalid result for names with invalid characters", () => {
    const invalidNames = [
      "John123",
      "Jane@Doe",
      "Mary-Jane",
      "Al_Smith",
      "John.Doe",
      "User1",
    ];

    for (const name of invalidNames) {
      const { result } = renderHook(() => useValidateName(name));

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toContain(
        "Can only contain letters and spaces"
      );
    }
  });

  it("should return valid result for names with only letters", () => {
    const validNames = ["John", "Mary", "ALLCAPS", "lowercase", "MixedCase"];

    for (const name of validNames) {
      const { result } = renderHook(() => useValidateName(name));

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
    }
  });

  it("should return valid result for names with spaces", () => {
    const validNames = [
      "John Doe",
      "Mary Jane Watson",
      "First Middle Last",
      "A B",
    ];

    for (const name of validNames) {
      const { result } = renderHook(() => useValidateName(name));

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
    }
  });

  it("should return invalid result for undefined name", () => {
    const { result } = renderHook(() => useValidateName(undefined));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid result for empty string", () => {
    const { result } = renderHook(() => useValidateName(""));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain("Must be at least 2 characters");
  });

  it("should memoize results for the same name", () => {
    const name = "John Doe";
    const { result, rerender } = renderHook(() => useValidateName(name));

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });

  it("should update result when name changes", () => {
    const { result, rerender } = renderHook(
      ({ nameValue }) => useValidateName(nameValue),
      {
        initialProps: { nameValue: "John Doe" },
      }
    );

    expect(result.current.isValid).toBe(true);

    rerender({ nameValue: "John123" });

    expect(result.current.isValid).toBe(false);
  });
});
