/**
 * @name Repository
 * @file src/lib/repository.ts
 * @description Class to manage repository information and configuration
 */

import path from "node:path";
import semver from "semver";

import type { FunctionResultPromise } from "@/types";
import type { RepoInfo } from "@/types/repository";
import MonorepoProjectProvider from "@lib/providers/monorepoProjectProvider";
import singleProvider from "@lib/providers/singleProvider";
import GitClient from "@lib/gitClient";
import { dirExists, readJsonFile } from "@utils/files";

class Repository {
  public gitClient: GitClient;
  public monorepoProjectProvider: MonorepoProjectProvider;
  public singleProvider: singleProvider;

  constructor() {
    this.gitClient = new GitClient();
    this.monorepoProjectProvider = new MonorepoProjectProvider();
    this.singleProvider = new singleProvider();
  }

  // #region - @getRepoType
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
      if (!rootPackageJson || typeof rootPackageJson !== "object") {
        throw new Error("Invalid package.json format");
      }

      // Check if the root package.json has a "workspaces" field
      const isMonorepo =
        rootPackageJson.workspaces !== null &&
        Array.isArray(rootPackageJson.workspaces);

      if (isMonorepo) {
        message = "Monorepo detected";
        data = "monorepo";
      } else {
        message = "Single repository detected";
        data = "single";
      }

      success = true;
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
  // #endregion - @getRepoType

  // #region - @getRepoInfo
  /**
   * @description Retrieves information about the current repository, including the current branch, remote URL, owner, and repository name.
   * @returns {FunctionResultPromise<{ currentBranch: string; remoteUrl: string; owner: string; repo: string } | null>}
   */
  public async getRepoInfo(): FunctionResultPromise<RepoInfo | null> {
    let success: boolean = false;
    let message: string = "";
    let data: RepoInfo | null = null;

    try {
      // Determine the repository type
      const repoTypeResult = await this.getRepoType();
      if (!repoTypeResult.success || !repoTypeResult.data) {
        throw new Error(repoTypeResult.message);
      }

      const [currentBranch, remoteUrl, ownerAndRepo, changes] =
        await Promise.all([
          this.gitClient.getCurrentBranch(),
          this.gitClient.getRemoteUrl(),
          this.gitClient.getOwnerAndRepo(),
          this.gitClient.getChanges(),
        ]);

      if (
        !currentBranch.success ||
        !currentBranch.data ||
        !remoteUrl.success ||
        !remoteUrl.data ||
        !ownerAndRepo.success ||
        !ownerAndRepo.data ||
        !changes.success ||
        !changes.data
      ) {
        throw new Error("Failed to retrieve repository information");
      }

      const getChangesValue = (path: string, working_dir: string) => {
        const changeInfo = this.gitClient.getChangeInfo(working_dir);
        return `${path} ${changeInfo.consoleColor(`(${working_dir}) ${changeInfo.label}`)}`;
      };

      success = true;
      message = "Repository information retrieved successfully";
      data = {
        repoType: repoTypeResult.data,
        currentBranch: currentBranch.data,
        remoteUrl: remoteUrl.data,
        owner: ownerAndRepo.data.owner,
        repo: ownerAndRepo.data.repo,
        changes: {
          behind: changes.data.behind,
          ahead: changes.data.ahead,
          files: changes.data.files.map((file) =>
            getChangesValue(file.path, file.working_dir)
          ),
        },
      };
    } catch (error: any) {
      success = false;
      message = "Failed to retrieve repository information";

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
  // #endregion - @getRepoInfo

  // #region - @suggestNextVersions
  /**
   * @description Suggests the next versions for a given version.
   * @param currentVersion The current version.
   * @returns An array of suggested next versions.
   */
  public suggestNextVersions(
    currentVersion: string,
    versionIdentifier?: string
  ): string[] {
    const versions: string[] = [];

    try {
      const patch = semver.inc(currentVersion, "patch");
      const minor = semver.inc(currentVersion, "minor");
      const major = semver.inc(currentVersion, "major");
      const prerelease = semver.inc(
        currentVersion,
        "prerelease",
        versionIdentifier || "beta"
      );
      if (patch) {
        versions.push(patch);
      }
      if (minor) {
        versions.push(minor);
      }
      if (major) {
        versions.push(major);
      }
      if (prerelease) {
        versions.push(prerelease);
      }
    } catch (error) {
      // Fallback if semver parsing fails
      versions.push("1.0.0");
    }

    return versions;
  }
  // #endregion - @suggestNextVersions
}

export default Repository;
