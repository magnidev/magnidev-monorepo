import { describe, expect, it } from "vitest";
import { cn } from "../../utils/cn";

// The cn utility merges Tailwind classes, deduplicates, and resolves conflicts.
describe("cn", () => {
  it("returns a single class as is", () => {
    expect(cn("p-4")).toBe("p-4");
  });

  it("merges multiple classes", () => {
    expect(cn("p-4", "m-2")).toBe("p-4 m-2");
  });

  it("deduplicates classes", () => {
    expect(cn("p-4", "p-4")).toBe("p-4");
  });

  it("resolves Tailwind class conflicts (last wins)", () => {
    expect(cn("p-4", "p-6")).toBe("p-6");
  });

  it("handles conditional classes", () => {
    // false && 'm-2' is always false, so omit it for clarity
    expect(cn("p-4", undefined, null, "text-lg")).toBe("p-4 text-lg");
  });

  it("handles array of classes", () => {
    expect(cn(["p-4", "m-2"], "text-lg")).toBe("p-4 m-2 text-lg");
  });

  it("handles objects for conditional classes", () => {
    expect(cn({ "p-4": true, "m-2": false }, "text-lg")).toBe("p-4 text-lg");
  });

  it("returns an empty string for no input", () => {
    expect(cn()).toBe("");
  });
});
