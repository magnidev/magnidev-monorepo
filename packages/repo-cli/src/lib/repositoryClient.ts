/**
 * @name Repository
 * @file src/lib/repository.ts
 * @description Class to manage repository information and configuration
 */

import path from "node:path";

import type { FunctionResultPromise } from "@/types";
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
   * @description Get the type of repository (single or monorepo) based on the presence of a workspaces field in package.json.
   * @returns {FunctionResultPromise<"single" | "monorepo" | null>} The type of repository or null if not determined.
   */
  public async getRepoType(): FunctionResultPromise<
    "single" | "monorepo" | null
  > {
    let success: boolean = false;
    let message: string = "";
    let data: "single" | "monorepo" | null = null;

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
        success = true;
        message = "Monorepo detected";
        data = "monorepo";
      }

      // If no "workspaces" field, it's a single repository
      success = true;
      message = "Single repository detected";
      data = "single";

      return {
        success,
        message,
        data,
      };
    } catch (error: any) {
      success = false;
      message = "Failed to determine repository type";

      if (error instanceof Error) {
        message = error.message;
      }
    }

    return {
      success,
      message,
      data,
    };
  }
}

export default Repository;
