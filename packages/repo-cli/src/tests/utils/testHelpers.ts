import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { vi } from "vitest";

import type { SingleProjectConfig, MonorepoProjectConfig } from "@/types";

/**
 * Creates a temporary directory for testing
 */
export function createTempDir(): string {
  return fs.mkdtempSync(path.join(tmpdir(), "repo-cli-test-"));
}

/**
 * Cleans up a temporary directory
 */
export function cleanupTempDir(tempDir: string): void {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.warn("Failed to clean up temp directory:", error);
  }
}

/**
 * Creates a basic package.json file in the specified directory
 */
export function createBasicPackageJson(
  dir: string,
  name: string = "test-project"
): void {
  const basicPackageJson = {
    name,
    version: "1.0.0",
    description: "Test project for repo-cli",
  };

  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(basicPackageJson, null, 2)
  );
}

/**
 * Creates a corrupted package.json file for testing error handling
 */
export function createCorruptedPackageJson(dir: string): void {
  fs.writeFileSync(path.join(dir, "package.json"), "{ invalid json }");
}

/**
 * Reads and parses a package.json file
 */
export function readPackageJson(dir: string): any {
  const packageJsonPath = path.join(dir, "package.json");
  return JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
}

/**
 * Creates a valid single project configuration
 */
export function createValidSingleProjectConfig(): SingleProjectConfig {
  return {
    publishConfig: {
      registry: "https://registry.npmjs.org/",
      access: "public",
    },
    release: {
      tagFormat: "v${version}",
    },
  };
}

/**
 * Creates a valid monorepo project configuration
 */
export function createValidMonorepoConfig(): MonorepoProjectConfig {
  return {
    release: {
      versioningStrategy: "independent",
      tagFormat: "${name}@{version}",
    },
    workspaces: ["packages/*"],
  };
}

/**
 * Creates an invalid single project configuration (invalid tag format)
 */
export function createInvalidSingleProjectConfig(): any {
  return {
    release: {
      tagFormat: "invalid-tag-format", // Missing ${version} placeholder
    },
  };
}

/**
 * Creates an invalid monorepo configuration (invalid versioning strategy or tag format)
 */
export function createInvalidMonorepoConfig(): any {
  return {
    release: {
      tagFormat: "invalid-tag-format", // Missing ${version} placeholder
      versioningStrategy: "invalid-strategy",
    },
    workspaces: ["packages/*"],
  };
}

/**
 * Mock prompts module for testing
 */
export function mockPrompts() {
  return {
    updateSettings: vi.fn(),
    intro: vi.fn(),
    outro: vi.fn(),
    cancel: vi.fn(),
    isCancel: vi.fn(() => false),
    group: vi.fn(),
    tasks: vi.fn(),
    select: vi.fn(),
    text: vi.fn(),
  };
}

/**
 * Creates a workspace directory structure for monorepo testing
 */
export function createMonorepoStructure(baseDir: string): void {
  // Create packages directory
  const packagesDir = path.join(baseDir, "packages");
  fs.mkdirSync(packagesDir, { recursive: true });

  // Create some sample packages
  const package1Dir = path.join(packagesDir, "package1");
  const package2Dir = path.join(packagesDir, "package2");

  fs.mkdirSync(package1Dir, { recursive: true });
  fs.mkdirSync(package2Dir, { recursive: true });

  // Create package.json files for each package
  createBasicPackageJson(package1Dir, "@test/package1");
  createBasicPackageJson(package2Dir, "@test/package2");
}

/**
 * Asserts that a file exists
 */
export function assertFileExists(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected file to exist: ${filePath}`);
  }
}

/**
 * Asserts that a file does not exist
 */
export function assertFileNotExists(filePath: string): void {
  if (fs.existsSync(filePath)) {
    throw new Error(`Expected file to not exist: ${filePath}`);
  }
}

/**
 * Creates a temporary workspace with proper setup and cleanup
 */
export class TempWorkspace {
  public readonly dir: string;
  private originalCwd: string;

  constructor(name: string = "test-workspace") {
    this.dir = createTempDir();
    this.originalCwd = process.cwd();

    // Change to temp directory
    process.chdir(this.dir);

    // Create basic package.json
    createBasicPackageJson(this.dir, name);
  }

  cleanup(): void {
    // Restore original working directory
    process.chdir(this.originalCwd);

    // Clean up temp directory
    cleanupTempDir(this.dir);
  }

  createMonorepoStructure(): void {
    createMonorepoStructure(this.dir);
  }

  readPackageJson(): any {
    return readPackageJson(this.dir);
  }
}
