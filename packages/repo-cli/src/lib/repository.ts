/**
 * @name Repository
 * @file src/lib/repository.ts
 * @description Class to manage repository information and configuration
 */

import path from "node:path";

import MonorepoProjectProvider from "@/lib/providers/monorepoProjectProvider";
import SingleProjectProvider from "@/lib/providers/singleProjectProvider";
import { dirExists, readJsonFile } from "@/utils/files";

class Repository {
  public monorepoProjectProvider: MonorepoProjectProvider =
    new MonorepoProjectProvider();
  public singleProjectProvider: SingleProjectProvider =
    new SingleProjectProvider();

  constructor() {}

  /**
   * @returns {Promise<"single" | "monorepo" | null>} Returns the type of repository: "single", "monorepo", or null if an error occurs.
   * @description Determines if the current repository is a single project or a monorepo by checking for the presence of a "workspaces" field in the root package.json file.
   */
  public async getRepoType(): Promise<"single" | "monorepo" | null> {
    try {
      // Load the root package.json file
      const rootPackageJsonPath = path.join(process.cwd(), "package.json");
      if (!dirExists(rootPackageJsonPath)) {
        throw new Error("No package.json found in the current directory");
      }

      // Read and parse the root package.json file
      const rootPackageJson = await readJsonFile(rootPackageJsonPath);

      // Check if the root package.json has a "workspaces" field
      if (rootPackageJson.workspaces) {
        return "monorepo"; // If it has a "workspaces" field, it's a monorepo
      }

      // If no "workspaces" field, it's a single repository
      return "single";
    } catch (error) {
      return null; // If any error occurs, return null
    }
  }
}

export default Repository;
