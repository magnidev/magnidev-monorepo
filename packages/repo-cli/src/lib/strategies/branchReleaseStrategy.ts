/**
 * @name BranchReleaseStrategy
 * @file src/lib/strategies/branchReleaseStrategy.ts
 * @description Handles the branch-based release strategy for creating release branches
 */

import path from "node:path";
import semver from "semver";

import type { FunctionResultPromise } from "@/types";
import type { Commit } from "@/types/gitClient";
import type {
  BranchReleaseData,
  BranchReleaseOptions,
  BranchReleaseResult,
} from "@/types/strategies/branchReleaseStrategy";
import RepositoryService from "@services/repositoryService";
import { dirExists, readJsonFile, writeJsonFile } from "@utils/files";

class BranchReleaseStrategy {
  private repositoryService: RepositoryService;
  private gitClient: RepositoryService["gitClient"];

  private monorepoProvider: RepositoryService["monorepoProvider"];
  private singleProvider: RepositoryService["singleProvider"];

  constructor(repositoryService: RepositoryService) {
    if (!repositoryService) {
      throw new Error(
        "RepositoryService is required for BranchReleaseStrategy"
      );
    }

    this.repositoryService = repositoryService;
    this.gitClient = repositoryService.gitClient;

    this.monorepoProvider = repositoryService.monorepoProvider;
    this.singleProvider = repositoryService.singleProvider;
  }

  // #region - @execute
  /**
   * @description Executes the branch release strategy
   * @param options Configuration for the branch release
   * @returns Promise resolving to the branch release result
   */
  public async execute(
    data: BranchReleaseData,
    options: BranchReleaseOptions
  ): FunctionResultPromise<BranchReleaseResult> {
    let success: boolean = false;
    let message: string = "";
    let dataResult: BranchReleaseResult = null;

    const { releaseNotes, packageName, version } = data;
    const { shouldPush = true, dryRun = false } = options;

    try {
      // 1. Validate inputs
      await this.validateInputs(packageName, version);

      // 2. Determine branch name and package info
      const branchInfo = await this.prepareBranchInfo(packageName, version);
      if (!branchInfo.success || !branchInfo.data) {
        throw new Error(branchInfo.message);
      }

      const { branchName, packagePath, currentVersion } = branchInfo.data;

      if (dryRun) {
        return {
          success: true,
          message: `Dry run: Release branch '${branchName}' would be created`,
          data: {
            branchName,
            releaseNotes,
            packagePath,
            previousVersion: currentVersion,
          },
        };
      }

      // 4. Create and checkout the release branch
      const branchResult = await this.createReleaseBranch(branchName);
      if (!branchResult.success) {
        throw new Error(branchResult.message);
      }

      // 5. Update package version
      const versionResult = await this.updatePackageVersion(
        packagePath,
        version
      );
      if (!versionResult.success) {
        throw new Error(versionResult.message);
      }

      // 6. Commit version changes
      const commitResult = await this.commitVersionBump(packageName, version);
      if (!commitResult.success) {
        throw new Error(commitResult.message);
      }

      // 7. Push branch if requested
      if (shouldPush) {
        const pushResult = await this.pushReleaseBranch(branchName);
        if (!pushResult.success) {
          throw new Error(pushResult.message);
        }
      }

      success = true;
      message = `Release branch '${branchName}' created successfully`;
      dataResult = {
        branchName,
        releaseNotes,
        packagePath,
        previousVersion: currentVersion,
      };
    } catch (error) {
      success = false;
      message = "Failed to execute branch release strategy";

      if (error instanceof Error) {
        message = error.message;
      }
    }

    return {
      success,
      message,
      data: dataResult,
    };
  }
  // #endregion - @execute

  // #region - @validateInputs
  /**
   * @description Validates the input parameters for branch release
   */
  private async validateInputs(
    packageName?: string,
    version?: string
  ): Promise<void> {
    if (!version || !semver.valid(version)) {
      throw new Error(`Invalid version format: ${version}`);
    }

    const repoType = await this.repositoryService.getRepoType();
    if (!repoType.success || !repoType.data) {
      throw new Error(repoType.message);
    }

    if (repoType.data === "monorepo" && !packageName) {
      throw new Error("Package name is required for monorepo releases");
    }
  }
  // #endregion - @validateInputs

  // #region - @prepareBranchInfo
  /**
   * @description Prepares branch information including name, package path, and current version
   */
  private async prepareBranchInfo(
    packageName?: string,
    version?: string
  ): FunctionResultPromise<{
    branchName: string;
    packagePath: string;
    currentVersion?: string;
  } | null> {
    let success: boolean = false;
    let message: string = "";
    let data: {
      branchName: string;
      packagePath: string;
      currentVersion?: string;
    } | null = null;

    try {
      const repoType = await this.repositoryService.getRepoType();
      if (!repoType.success || !repoType.data) {
        throw new Error(repoType.message);
      }

      let branchName: string;
      let packagePath: string;
      let currentVersion: string | undefined;

      if (repoType.data === "single") {
        branchName = `release/v${version}`;
        packagePath = ".";

        // Get current version from package.json
        const packageJson = await readJsonFile(
          path.join(process.cwd(), "package.json")
        );
        currentVersion = packageJson?.version;
      } else if (repoType.data === "monorepo") {
        branchName = `release/${packageName}@${version}`;

        const packageDirResult = await this.monorepoProvider.getPackagePath(
          packageName!
        );
        if (!packageDirResult.success || !packageDirResult.data) {
          throw new Error(`Package directory not found for: ${packageName}`);
        }
        packagePath = packageDirResult.data;

        // Get current version from package's package.json
        const packageJson = await readJsonFile(
          path.join(process.cwd(), packagePath, "package.json")
        );
        currentVersion = packageJson?.version;
      } else {
        throw new Error("Unknown repository type");
      }

      success = true;
      message = "Branch information prepared successfully";
      data = { branchName, packagePath, currentVersion };
    } catch (error) {
      success = false;
      message = "Failed to prepare branch information";

      if (error instanceof Error) {
        message = error.message;
      }
    }

    return { success, message, data };
  }
  // #endregion - @prepareBranchInfo

  // #region - @createReleaseBranch
  /**
   * @description Creates and checks out the release branch
   */
  private async createReleaseBranch(
    branchName: string
  ): FunctionResultPromise<void> {
    const result = await this.gitClient.createBranch(branchName);
    return {
      success: result.success,
      message: result.success
        ? `Release branch '${branchName}' created successfully`
        : result.message,
      data: undefined,
    };
  }
  // #endregion - @createReleaseBranch

  // #region - @updatePackageVersion
  /**
   * @description Updates the version in package.json
   */
  private async updatePackageVersion(
    packagePath: string,
    version: string
  ): FunctionResultPromise<void> {
    let success: boolean = false;
    let message: string = "";

    try {
      const packageJsonPath = path.join(
        packagePath === "."
          ? process.cwd()
          : path.join(process.cwd(), packagePath),
        "package.json"
      );

      if (!dirExists(packageJsonPath)) {
        throw new Error(`Package.json not found at: ${packageJsonPath}`);
      }

      const packageJson = await readJsonFile(packageJsonPath);
      if (!packageJson) {
        throw new Error(`Failed to read package.json at: ${packageJsonPath}`);
      }

      packageJson.version = version;

      await writeJsonFile(packageJsonPath, packageJson);

      success = true;
      message = `Version updated to ${version} in ${packageJsonPath}`;
    } catch (error) {
      success = false;
      message = "Failed to update package version";

      if (error instanceof Error) {
        message = error.message;
      }
    }

    return { success, message, data: undefined };
  }
  // #endregion - @updatePackageVersion

  // #region - @commitVersionBump
  /**
   * @description Commits the version bump changes
   */
  private async commitVersionBump(
    packageName?: string,
    version?: string
  ): FunctionResultPromise<void> {
    const result = await this.gitClient.commitChanges({
      type: "chore",
      message: `bump version to ${version}`,
      scope: packageName || undefined,
    });

    return {
      success: result.success,
      message: result.success
        ? `Version bump committed for ${version}`
        : result.message,
      data: undefined,
    };
  }
  // #endregion - @commitVersionBump

  // #region - @pushReleaseBranch
  /**
   * @description Pushes the release branch to remote
   */
  private async pushReleaseBranch(
    branchName: string
  ): FunctionResultPromise<void> {
    const result = await this.gitClient.pushBranch(branchName);
    return {
      success: result.success,
      message: result.success
        ? `Release branch '${branchName}' pushed to remote`
        : result.message,
      data: undefined,
    };
  }
  // #endregion - @pushReleaseBranch

  // #region - @formatReleaseNotes
  /**
   * @description Formats commits into release notes
   */
  private formatReleaseNotes(commits: Commit[], packageName?: string): string {
    const packageTitle = packageName ? ` for ${packageName}` : "";
    const releaseNotes = [`## Changes${packageTitle}\n`];

    // Group commits by type
    const commitsByType: Record<string, Commit[]> = {};

    for (const commit of commits) {
      const message = commit.message;
      const match = message.match(
        /^(feat|fix|docs|style|refactor|perf|test|chore|build|ci)(\([^)]*\))?:/
      );

      let type = "other";
      if (match) {
        type = match[1];
      }

      if (!commitsByType[type]) {
        commitsByType[type] = [];
      }
      commitsByType[type].push(commit);
    }

    // Add commits in order of importance
    const typeOrder = [
      "feat",
      "fix",
      "perf",
      "refactor",
      "docs",
      "style",
      "test",
      "chore",
      "build",
      "ci",
      "other",
    ];
    const typeLabels: Record<string, string> = {
      feat: "🚀 Features",
      fix: "🐛 Bug Fixes",
      perf: "⚡ Performance Improvements",
      refactor: "♻️ Code Refactoring",
      docs: "📚 Documentation",
      style: "💄 Styles",
      test: "🧪 Tests",
      chore: "🔧 Chores",
      build: "📦 Build System",
      ci: "🤖 CI/CD",
      other: "📝 Other Changes",
    };

    for (const type of typeOrder) {
      if (commitsByType[type] && commitsByType[type].length > 0) {
        const typeLabel = typeLabels[type] || "📝 Other Changes";
        releaseNotes.push(`### ${typeLabel}\n`);

        for (const commit of commitsByType[type]) {
          const commitMessage = commit.message.split("\n")[0];
          const cleanMessage = commitMessage.replace(
            /^(feat|fix|docs|style|refactor|perf|test|chore|build|ci)(\(.+?\))?:\s*/,
            ""
          );
          releaseNotes.push(`- ${cleanMessage}`);
        }
        releaseNotes.push(""); // Add empty line after each section
      }
    }

    return releaseNotes.join("\n");
  }
  // #endregion - @formatReleaseNotes
}

export default BranchReleaseStrategy;
