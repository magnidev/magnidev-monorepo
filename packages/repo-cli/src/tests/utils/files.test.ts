import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";

import {
  dirExists,
  readJsonFile,
  writeJsonFile,
  readMdFile,
  writeMdFile,
  appendMdFile,
} from "@/utils/files";

// Mock fs module
vi.mock("node:fs");

describe("Files Utilities", () => {
  const mockFs = vi.mocked(fs);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("dirExists", () => {
    it("should return true when directory exists", () => {
      mockFs.existsSync.mockReturnValue(true);

      const result = dirExists("/existing/path");

      expect(result).toBe(true);
      expect(mockFs.existsSync).toHaveBeenCalledWith("/existing/path");
    });

    it("should return false when directory does not exist", () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = dirExists("/non-existing/path");

      expect(result).toBe(false);
      expect(mockFs.existsSync).toHaveBeenCalledWith("/non-existing/path");
    });

    it("should handle empty path", () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = dirExists("");

      expect(result).toBe(false);
      expect(mockFs.existsSync).toHaveBeenCalledWith("");
    });
  });

  describe("readJsonFile", () => {
    it("should read and parse valid JSON file", async () => {
      const mockData = { name: "test", version: "1.0.0" };
      const mockJsonString = JSON.stringify(mockData);

      mockFs.promises.readFile = vi.fn().mockResolvedValue(mockJsonString);

      const result = await readJsonFile("/path/to/file.json");

      expect(result).toEqual(mockData);
      expect(mockFs.promises.readFile).toHaveBeenCalledWith(
        "/path/to/file.json",
        "utf8"
      );
    });

    it("should throw error for invalid JSON", async () => {
      mockFs.promises.readFile = vi.fn().mockResolvedValue("invalid json");

      await expect(readJsonFile("/path/to/invalid.json")).rejects.toThrow();
      expect(mockFs.promises.readFile).toHaveBeenCalledWith(
        "/path/to/invalid.json",
        "utf8"
      );
    });

    it("should throw error when file does not exist", async () => {
      const error = new Error("ENOENT: no such file or directory");
      mockFs.promises.readFile = vi.fn().mockRejectedValue(error);

      await expect(readJsonFile("/non-existing/file.json")).rejects.toThrow(
        "ENOENT: no such file or directory"
      );
    });

    it("should handle empty JSON file", async () => {
      mockFs.promises.readFile = vi.fn().mockResolvedValue("");

      await expect(readJsonFile("/path/to/empty.json")).rejects.toThrow();
    });

    it("should handle complex nested JSON objects", async () => {
      const complexData = {
        name: "complex-package",
        scripts: {
          build: "tsc",
          test: "vitest",
        },
        dependencies: {
          typescript: "^5.0.0",
        },
        nested: {
          deeply: {
            nested: {
              value: [1, 2, 3],
            },
          },
        },
      };
      const mockJsonString = JSON.stringify(complexData);

      mockFs.promises.readFile = vi.fn().mockResolvedValue(mockJsonString);

      const result = await readJsonFile("/path/to/complex.json");

      expect(result).toEqual(complexData);
    });
  });

  describe("writeJsonFile", () => {
    it("should write JSON data to file with proper formatting", async () => {
      const data = { name: "test", version: "1.0.0" };
      const expectedJson = JSON.stringify(data, null, 2);

      mockFs.promises.writeFile = vi.fn().mockResolvedValue(undefined);

      await writeJsonFile("/path/to/output.json", data);

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        "/path/to/output.json",
        expectedJson,
        "utf8"
      );
    });

    it("should handle empty object", async () => {
      const data = {};
      const expectedJson = JSON.stringify(data, null, 2);

      mockFs.promises.writeFile = vi.fn().mockResolvedValue(undefined);

      await writeJsonFile("/path/to/empty.json", data);

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        "/path/to/empty.json",
        expectedJson,
        "utf8"
      );
    });

    it("should handle complex nested objects", async () => {
      const complexData = {
        name: "complex-package",
        scripts: {
          build: "tsc",
          test: "vitest",
        },
        dependencies: {
          typescript: "^5.0.0",
        },
        array: [1, 2, { nested: "value" }],
      };
      const expectedJson = JSON.stringify(complexData, null, 2);

      mockFs.promises.writeFile = vi.fn().mockResolvedValue(undefined);

      await writeJsonFile("/path/to/complex.json", complexData);

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        "/path/to/complex.json",
        expectedJson,
        "utf8"
      );
    });

    it("should throw error when write fails", async () => {
      const data = { name: "test" };
      const error = new Error("EACCES: permission denied");

      mockFs.promises.writeFile = vi.fn().mockRejectedValue(error);

      await expect(writeJsonFile("/readonly/file.json", data)).rejects.toThrow(
        "EACCES: permission denied"
      );
    });

    it("should handle objects with special characters", async () => {
      const data = {
        name: "test-package",
        description: "A package with special chars: åäö 中文 🚀",
        emoji: "🎉",
        unicode: "∑∆©®™",
      };
      const expectedJson = JSON.stringify(data, null, 2);

      mockFs.promises.writeFile = vi.fn().mockResolvedValue(undefined);

      await writeJsonFile("/path/to/special.json", data);

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        "/path/to/special.json",
        expectedJson,
        "utf8"
      );
    });
  });

  describe("readMdFile", () => {
    it("should read markdown file content", async () => {
      const mockContent = "# Test\n\nThis is a test markdown file.";

      mockFs.promises.readFile = vi.fn().mockResolvedValue(mockContent);

      const result = await readMdFile("/path/to/test.md");

      expect(result).toBe(mockContent);
      expect(mockFs.promises.readFile).toHaveBeenCalledWith(
        "/path/to/test.md",
        "utf8"
      );
    });

    it("should handle empty markdown file", async () => {
      mockFs.promises.readFile = vi.fn().mockResolvedValue("");

      const result = await readMdFile("/path/to/empty.md");

      expect(result).toBe("");
    });

    it("should handle markdown with special characters", async () => {
      const mockContent = `# Test with Special Characters

This file contains:
- Unicode: åäö 中文 🚀
- Code blocks: \`\`\`typescript
const test = "hello";
\`\`\`
- Links: [GitHub](https://github.com)
- Images: ![alt text](image.png)
`;

      mockFs.promises.readFile = vi.fn().mockResolvedValue(mockContent);

      const result = await readMdFile("/path/to/special.md");

      expect(result).toBe(mockContent);
    });

    it("should throw error when file does not exist", async () => {
      const error = new Error("ENOENT: no such file or directory");
      mockFs.promises.readFile = vi.fn().mockRejectedValue(error);

      await expect(readMdFile("/non-existing/file.md")).rejects.toThrow(
        "ENOENT: no such file or directory"
      );
    });

    it("should handle large markdown files", async () => {
      const largeContent = "# Large File\n\n" + "Lorem ipsum ".repeat(1000);

      mockFs.promises.readFile = vi.fn().mockResolvedValue(largeContent);

      const result = await readMdFile("/path/to/large.md");

      expect(result).toBe(largeContent);
      expect(result.length).toBeGreaterThan(10000);
    });
  });

  describe("writeMdFile", () => {
    it("should write markdown content to file", async () => {
      const content = "# Test\n\nThis is a test markdown file.";

      mockFs.promises.writeFile = vi.fn().mockResolvedValue(undefined);

      await writeMdFile("/path/to/output.md", content);

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        "/path/to/output.md",
        content,
        "utf8"
      );
    });

    it("should handle empty content", async () => {
      const content = "";

      mockFs.promises.writeFile = vi.fn().mockResolvedValue(undefined);

      await writeMdFile("/path/to/empty.md", content);

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        "/path/to/empty.md",
        content,
        "utf8"
      );
    });

    it("should handle content with special characters", async () => {
      const content = `# Special Characters Test

Unicode: åäö 中文 🚀
Code: \`console.log("hello");\`
Math: α + β = γ
Symbols: ©®™§¶`;

      mockFs.promises.writeFile = vi.fn().mockResolvedValue(undefined);

      await writeMdFile("/path/to/special.md", content);

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        "/path/to/special.md",
        content,
        "utf8"
      );
    });

    it("should throw error when write fails", async () => {
      const content = "# Test";
      const error = new Error("EACCES: permission denied");

      mockFs.promises.writeFile = vi.fn().mockRejectedValue(error);

      await expect(writeMdFile("/readonly/file.md", content)).rejects.toThrow(
        "EACCES: permission denied"
      );
    });

    it("should handle multiline content with different line endings", async () => {
      const content = "# Test\r\n\r\nWindows line endings\r\n\r\nMore content";

      mockFs.promises.writeFile = vi.fn().mockResolvedValue(undefined);

      await writeMdFile("/path/to/lineendings.md", content);

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        "/path/to/lineendings.md",
        content,
        "utf8"
      );
    });
  });

  describe("appendMdFile", () => {
    it("should append content to markdown file", async () => {
      const content = "\n\n## New Section\n\nAppended content.";

      mockFs.promises.appendFile = vi.fn().mockResolvedValue(undefined);

      await appendMdFile("/path/to/existing.md", content);

      expect(mockFs.promises.appendFile).toHaveBeenCalledWith(
        "/path/to/existing.md",
        content,
        "utf8"
      );
    });

    it("should handle empty content", async () => {
      const content = "";

      mockFs.promises.appendFile = vi.fn().mockResolvedValue(undefined);

      await appendMdFile("/path/to/file.md", content);

      expect(mockFs.promises.appendFile).toHaveBeenCalledWith(
        "/path/to/file.md",
        content,
        "utf8"
      );
    });

    it("should handle content with special characters", async () => {
      const content =
        "\n\n🎉 New feature added!\n\nWith unicode: åäö and emoji: 🚀";

      mockFs.promises.appendFile = vi.fn().mockResolvedValue(undefined);

      await appendMdFile("/path/to/changelog.md", content);

      expect(mockFs.promises.appendFile).toHaveBeenCalledWith(
        "/path/to/changelog.md",
        content,
        "utf8"
      );
    });

    it("should throw error when append fails", async () => {
      const content = "\n\nNew content";
      const error = new Error("EACCES: permission denied");

      mockFs.promises.appendFile = vi.fn().mockRejectedValue(error);

      await expect(appendMdFile("/readonly/file.md", content)).rejects.toThrow(
        "EACCES: permission denied"
      );
    });

    it("should handle large content appends", async () => {
      const largeContent = "\n\n" + "Appended line\n".repeat(1000);

      mockFs.promises.appendFile = vi.fn().mockResolvedValue(undefined);

      await appendMdFile("/path/to/large.md", largeContent);

      expect(mockFs.promises.appendFile).toHaveBeenCalledWith(
        "/path/to/large.md",
        largeContent,
        "utf8"
      );
    });

    it("should handle multiple consecutive appends", async () => {
      const content1 = "\n\n## Section 1";
      const content2 = "\n\n## Section 2";

      mockFs.promises.appendFile = vi.fn().mockResolvedValue(undefined);

      await appendMdFile("/path/to/file.md", content1);
      await appendMdFile("/path/to/file.md", content2);

      expect(mockFs.promises.appendFile).toHaveBeenCalledTimes(2);
      expect(mockFs.promises.appendFile).toHaveBeenNthCalledWith(
        1,
        "/path/to/file.md",
        content1,
        "utf8"
      );
      expect(mockFs.promises.appendFile).toHaveBeenNthCalledWith(
        2,
        "/path/to/file.md",
        content2,
        "utf8"
      );
    });
  });

  describe("Integration scenarios", () => {
    it("should handle read-modify-write workflow for JSON files", async () => {
      const originalData = { name: "test", version: "1.0.0" };
      const modifiedData = {
        name: "test",
        version: "1.1.0",
        description: "Updated",
      };

      // Mock reading the original file
      mockFs.promises.readFile = vi
        .fn()
        .mockResolvedValue(JSON.stringify(originalData));
      mockFs.promises.writeFile = vi.fn().mockResolvedValue(undefined);

      // Read, modify, and write back
      const readData = await readJsonFile("/path/to/package.json");
      const updatedData = {
        ...readData,
        version: "1.1.0",
        description: "Updated",
      };
      await writeJsonFile("/path/to/package.json", updatedData);

      expect(readData).toEqual(originalData);
      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        "/path/to/package.json",
        JSON.stringify(modifiedData, null, 2),
        "utf8"
      );
    });

    it("should handle read-append workflow for markdown files", async () => {
      const originalContent = "# Changelog\n\n## v1.0.0\n- Initial release";
      const appendContent = "\n\n## v1.1.0\n- Bug fixes";

      mockFs.promises.readFile = vi.fn().mockResolvedValue(originalContent);
      mockFs.promises.appendFile = vi.fn().mockResolvedValue(undefined);

      const content = await readMdFile("/path/to/CHANGELOG.md");
      await appendMdFile("/path/to/CHANGELOG.md", appendContent);

      expect(content).toBe(originalContent);
      expect(mockFs.promises.appendFile).toHaveBeenCalledWith(
        "/path/to/CHANGELOG.md",
        appendContent,
        "utf8"
      );
    });

    it("should handle error recovery scenarios", async () => {
      // First call fails, second succeeds
      mockFs.promises.readFile = vi
        .fn()
        .mockRejectedValueOnce(new Error("Temporary failure"))
        .mockResolvedValueOnce('{"name": "test"}');

      // First attempt should fail
      await expect(readJsonFile("/path/to/file.json")).rejects.toThrow(
        "Temporary failure"
      );

      // Second attempt should succeed
      const result = await readJsonFile("/path/to/file.json");
      expect(result).toEqual({ name: "test" });
    });
  });

  describe("Edge cases", () => {
    it("should handle very long file paths", async () => {
      const longPath =
        "/very/long/path/that/might/cause/issues/" +
        "deep/".repeat(50) +
        "file.json";
      const data = { test: "value" };

      mockFs.promises.writeFile = vi.fn().mockResolvedValue(undefined);

      await writeJsonFile(longPath, data);

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        longPath,
        JSON.stringify(data, null, 2),
        "utf8"
      );
    });

    it("should handle files with unusual extensions", async () => {
      const content = "# Documentation";

      mockFs.promises.writeFile = vi.fn().mockResolvedValue(undefined);

      await writeMdFile("/path/to/file.markdown", content);
      await writeMdFile("/path/to/file.mdown", content);
      await writeMdFile("/path/to/file.txt", content);

      expect(mockFs.promises.writeFile).toHaveBeenCalledTimes(3);
    });

    it("should handle null and undefined values in JSON", async () => {
      const data = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: "",
        zero: 0,
        false: false,
      };

      mockFs.promises.writeFile = vi.fn().mockResolvedValue(undefined);

      await writeJsonFile("/path/to/edge-cases.json", data);

      // undefined should be omitted from JSON
      const expectedJson = JSON.stringify(
        {
          nullValue: null,
          emptyString: "",
          zero: 0,
          false: false,
        },
        null,
        2
      );

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        "/path/to/edge-cases.json",
        expectedJson,
        "utf8"
      );
    });
  });
});
