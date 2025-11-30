import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useValidateUsername } from "../../../hooks/use-validations";

describe("useValidateUsername", () => {
  it("should return valid result for valid usernames", () => {
    const validUsernames = [
      "john_doe",
      "jane123",
      "user_name",
      "test_user",
      "username123",
      "valid_user_123",
    ];

    for (const username of validUsernames) {
      const { result } = renderHook(() => useValidateUsername(username));

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
    }
  });

  it("should return invalid result for usernames that are too short", () => {
    const shortUsernames = ["user", "abc", "12345"];

    for (const username of shortUsernames) {
      const { result } = renderHook(() => useValidateUsername(username));

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toContain("Must be at least 6 characters");
    }
  });

  it("should return invalid result for usernames that are too long", () => {
    const longUsername = "a".repeat(21);
    const { result } = renderHook(() => useValidateUsername(longUsername));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain("Must be at most 20 characters");
  });

  it("should return invalid result for usernames with invalid characters", () => {
    const invalidUsernames = [
      "user-name",
      "user.name",
      "user@name",
      "user name",
      "user#name",
      "user$name",
    ];

    for (const username of invalidUsernames) {
      const { result } = renderHook(() => useValidateUsername(username));

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toContain(
        "Can only contain letters, numbers, and underscores"
      );
    }
  });

  it("should return invalid result for banned usernames", () => {
    const bannedUsernames = [
      "admin",
      "administrator",
      "root",
      "superuser",
      "system",
      "support",
    ];

    for (const username of bannedUsernames) {
      const { result } = renderHook(() => useValidateUsername(username));

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toContain("This username is not allowed");
    }
  });

  it("should return invalid result for banned usernames regardless of case", () => {
    const bannedUsernames = [
      "ADMIN",
      "Administrator",
      "ROOT",
      "SuperUser",
      "SYSTEM",
    ];

    for (const username of bannedUsernames) {
      const { result } = renderHook(() => useValidateUsername(username));

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toContain("This username is not allowed");
    }
  });

  it("should accept custom banned usernames list", () => {
    const customBannedUsernames = ["custom", "blocked", "forbidden"];

    const { result: validResult } = renderHook(() =>
      useValidateUsername("custom", { bannedUsernames: customBannedUsernames })
    );

    expect(validResult.current.isValid).toBe(false);
    expect(validResult.current.errors).toContain(
      "This username is not allowed"
    );

    // Username not in custom banned list should be valid (if it meets other criteria)
    const { result: validResult2 } = renderHook(() =>
      useValidateUsername("admin123", {
        bannedUsernames: customBannedUsernames,
      })
    );

    expect(validResult2.current.isValid).toBe(true);
  });

  it("should override default banned usernames when custom list is provided", () => {
    const customBannedUsernames = ["onlyThisOne"];

    // 'admin' should be valid when using custom banned list
    const { result } = renderHook(() =>
      useValidateUsername("admin123", {
        bannedUsernames: customBannedUsernames,
      })
    );

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toEqual([]);
  });

  it("should return invalid result for undefined username", () => {
    const { result } = renderHook(() => useValidateUsername(undefined));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid result for empty string", () => {
    const { result } = renderHook(() => useValidateUsername(""));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain("Must be at least 6 characters");
  });

  it("should memoize results for the same username and options", () => {
    const username = "validuser";
    const options = { bannedUsernames: ["banned"] };
    const { result, rerender } = renderHook(() =>
      useValidateUsername(username, options)
    );

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });

  it("should update result when username changes", () => {
    const { result, rerender } = renderHook(
      ({ usernameValue }) => useValidateUsername(usernameValue),
      {
        initialProps: { usernameValue: "validuser" },
      }
    );

    expect(result.current.isValid).toBe(true);

    rerender({ usernameValue: "admin" });

    expect(result.current.isValid).toBe(false);
  });

  it("should update result when options change", () => {
    const { result, rerender } = renderHook(
      ({ options }) => useValidateUsername("testuser", options),
      {
        initialProps: { options: { bannedUsernames: ["other"] } },
      }
    );

    expect(result.current.isValid).toBe(true);

    rerender({ options: { bannedUsernames: ["testuser"] } });

    expect(result.current.isValid).toBe(false);
  });
});
