import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { useValidateText } from "../../../hooks/use-validations";

const lettersOnlyRegex = /^[a-zA-Z]+$/;

describe("useValidateText", () => {
  const stringSchema = z.string().min(3).max(10);
  const emailSchema = z.string().email();

  it("should return valid result for text that passes schema validation", () => {
    const validTexts = ["test", "hello", "valid"];

    for (const text of validTexts) {
      const { result } = renderHook(() => useValidateText(text, stringSchema));

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
    }
  });

  it("should return invalid result for text that fails schema validation", () => {
    const invalidTexts = ["ab", "toolongstring"];

    for (const text of invalidTexts) {
      const { result } = renderHook(() => useValidateText(text, stringSchema));

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors.length).toBeGreaterThan(0);
    }
  });

  it("should work with different schema types", () => {
    // Test with email schema
    const { result: emailResult } = renderHook(() =>
      useValidateText("test@example.com", emailSchema)
    );

    expect(emailResult.current.isValid).toBe(true);
    expect(emailResult.current.errors).toEqual([]);

    const { result: invalidEmailResult } = renderHook(() =>
      useValidateText("invalid-email", emailSchema)
    );

    expect(invalidEmailResult.current.isValid).toBe(false);
    expect(invalidEmailResult.current.errors.length).toBeGreaterThan(0);
  });

  it("should work with number schema when text is converted", () => {
    // Note: This test assumes the text will be converted to number by the schema
    const numberStringSchema = z
      .string()
      .transform((val) => Number.parseInt(val, 10))
      .pipe(z.number().min(0).max(100));

    const { result } = renderHook(() =>
      useValidateText("50", numberStringSchema)
    );

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toEqual([]);
  });

  it("should handle complex schema with multiple constraints", () => {
    const complexSchema = z
      .string()
      .min(5, "Too short")
      .max(15, "Too long")
      .regex(lettersOnlyRegex, "Only letters allowed");

    const { result: validResult } = renderHook(() =>
      useValidateText("validtext", complexSchema)
    );

    expect(validResult.current.isValid).toBe(true);
    expect(validResult.current.errors).toEqual([]);

    const { result: invalidResult } = renderHook(() =>
      useValidateText("invalid123", complexSchema)
    );

    expect(invalidResult.current.isValid).toBe(false);
    expect(invalidResult.current.errors).toContain("Only letters allowed");
  });

  it("should throw error when schema is not provided", () => {
    expect(() => {
      // @ts-expect-error - Testing error case
      renderHook(() => useValidateText("test", null));
    }).toThrow("Schema is required for validation");
  });

  it("should throw error when schema is undefined", () => {
    expect(() => {
      // @ts-expect-error - Testing error case
      renderHook(() => useValidateText("test", undefined));
    }).toThrow("Schema is required for validation");
  });

  it("should collect multiple validation errors", () => {
    const multiErrorSchema = z
      .string()
      .min(10, "Too short")
      .regex(lettersOnlyRegex, "Only letters allowed");

    const { result } = renderHook(() =>
      useValidateText("test123", multiErrorSchema)
    );

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors.length).toBeGreaterThan(0);
    expect(result.current.errors).toContain("Too short");
  });

  it("should memoize results for the same text and schema", () => {
    const text = "test";
    const schema = stringSchema;
    const { result, rerender } = renderHook(() =>
      useValidateText(text, schema)
    );

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });

  it("should update result when text changes", () => {
    const { result, rerender } = renderHook(
      ({ textValue }) => useValidateText(textValue, stringSchema),
      {
        initialProps: { textValue: "valid" },
      }
    );

    expect(result.current.isValid).toBe(true);

    rerender({ textValue: "ab" });

    expect(result.current.isValid).toBe(false);
  });

  it("should update result when schema changes", () => {
    const schema1 = z.string().min(3);
    const schema2 = z.string().min(10);

    const { result, rerender } = renderHook(
      ({ schema }) => useValidateText("test", schema),
      {
        initialProps: { schema: schema1 },
      }
    );

    expect(result.current.isValid).toBe(true);

    rerender({ schema: schema2 });

    expect(result.current.isValid).toBe(false);
  });

  it("should handle empty string validation", () => {
    const { result } = renderHook(() => useValidateText("", stringSchema));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors.length).toBeGreaterThan(0);
  });

  it("should work with optional schema", () => {
    const optionalSchema = z.string().optional();

    const { result } = renderHook(() => useValidateText("", optionalSchema));

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toEqual([]);
  });
});
