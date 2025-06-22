/**
 * @name ReleaseService
 * @file src/lib/services/releaseService.ts
 * @description Class to manage release information and configuration
 */

import semver from "semver";

import type { FunctionResult, FunctionResultPromise } from "@/types";
import type {
  CommitChangesResult,
  SuggestVersionsResult,
} from "@/types/services/releaseService";
import RepositoryClient from "@/lib/services/repositoryService";

class ReleaseService {
  private repositoryClient: RepositoryClient;
  private gitClient: RepositoryClient["gitClient"];
  private monorepoProvider: RepositoryClient["monorepoProvider"];
  private singleProvider: RepositoryClient["singleProvider"];

  constructor(repositoryClient: RepositoryClient) {
    if (!repositoryClient) {
      throw new Error("RepositoryClient is required");
    }

    this.repositoryClient = repositoryClient;
    this.gitClient = repositoryClient.gitClient;
    this.monorepoProvider = repositoryClient.monorepoProvider;
    this.singleProvider = repositoryClient.singleProvider;
  }

  // #region - @suggestVersions
  /**
   * @description Suggests the next versions for a given version.
   * @param currentVersion The current version.
   * @returns An array of suggested next versions.
   */
  public async suggestVersions(
    currentVersion: string
  ): FunctionResultPromise<SuggestVersionsResult> {
    let success: boolean = false;
    let message: string = "";
    let data: SuggestVersionsResult = null;

    let versionIdentifier: string | undefined = undefined;

    const repoType = await this.repositoryClient.getRepoType();
    if (!repoType.success || !repoType.data) {
      throw new Error(repoType.message);
    }

    if (repoType.data === "monorepo") {
      const config = await this.repositoryClient.monorepoProvider.getConfig();
      if (!config.success || !config.data) {
        throw new Error(config.message);
      }

      versionIdentifier = config.data?.release.preReleaseIdentifier;
    } else if (repoType.data === "single") {
      const config = await this.repositoryClient.singleProvider.getConfig();
      if (!config.success || !config.data) {
        throw new Error(config.message);
      }

      versionIdentifier = config.data?.release.preReleaseIdentifier;
    }

    try {
      success = true;
      message = "Suggested versions retrieved successfully";
      data = {
        major: semver.inc(currentVersion, "major"),
        minor: semver.inc(currentVersion, "minor"),
        patch: semver.inc(currentVersion, "patch"),
        prerelease: semver.inc(currentVersion, "prerelease", versionIdentifier),
      };
    } catch (error) {
      success = false;
      message = "Failed to suggest versions";

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
  // #endregion - @suggestVersions

  // #region - @commitChanges
  /**
   * @description Commits changes to the repository.
   * @param data The data containing changes, commit type, message, body, and scope.
   * @param options Options for committing, including whether to push and if it's a dry run
   */
  public async commitChanges(
    data: {
      changes: string[];
      commitType: string;
      commitMessage: string;
      commitBody?: string;
      commitScope?: string;
    },
    options: {
      shouldPush?: boolean;
      dryRun?: boolean;
    }
  ): FunctionResultPromise<CommitChangesResult> {
    let success: boolean = false;
    let message: string = "";
    let dataResult: CommitChangesResult | null = null;

    const { changes, commitType, commitMessage, commitBody, commitScope } =
      data;
    const { shouldPush, dryRun } = options;

    try {
      // Prepare the files to commit
      const filesToCommit = changes.map((change: string) => {
        const [path, workingDir] = change.split(":");
        return { path, workingDir }; // Assuming change is in the format "path:workingDir"
      });

      if (dryRun) {
        // If dry run, just return the tag name without creating it
        return {
          success: true,
          message: "Dry run: Commit changes skipped",
          data: { changes: changes },
        };
      }

      // Add changes to the git staging area
      const addResult = await this.gitClient.addFiles(
        filesToCommit.map((file) => file.path)
      );
      if (!addResult.success) {
        throw new Error(addResult.message);
      }

      // Perform the commit
      const commitResult = await this.gitClient.commitChanges({
        type: commitType,
        message: commitMessage,
        body: commitBody,
        scope: commitScope,
      });
      if (!commitResult.success) {
        throw new Error(commitResult.message);
      }

      // If the user opted to push, do it now
      if (shouldPush) {
        const pushResult = await this.gitClient.pushChanges();
        if (!pushResult.success) {
          throw new Error(pushResult.message);
        }
      }

      success = true;
      message = "Changes committed successfully";
      dataResult = { changes };
    } catch (error) {
      success = false;
      message = "Failed to create git tag";

      if (error instanceof Error) {
        message = error.message;
      }
    }

    return {
      success,
      message,
    };
  }
  // #endregion - @commitChanges

  // #region - @createTag
  /**
   * @description Creates a new tag in the repository.
   * @param tagName The name of the tag to create.
   * @returns A promise that resolves to a FunctionResult indicating success or failure.
   */
  public async createTag(
    data: { packageName: string; version: string },
    options: {
      shouldPush?: boolean;
      dryRun?: boolean;
    }
  ): FunctionResultPromise<string | null> {
    let success: boolean = false;
    let message: string = "";
    let dataResult: string | null = null;

    const { packageName, version } = data;
    const { shouldPush, dryRun } = options;

    try {
      const repoType = await this.repositoryClient.getRepoType();
      if (!repoType.success || !repoType.data) {
        throw new Error(repoType.message);
      }

      if (!semver.valid(version)) {
        throw new Error(`Invalid version format: ${version}`);
      }

      let tagName: string;

      if (repoType.data === "single") {
        const config = await this.singleProvider.getConfig();
        if (!config.success || !config.data) {
          throw new Error(config.message);
        }

        tagName = config.data?.release.tagFormat.replace("${version}", version);
      } else if (repoType.data === "monorepo") {
        const config = await this.monorepoProvider.getConfig();
        if (!config.success || !config.data) {
          throw new Error(config.message);
        }

        if (config.data.release.versioningStrategy === "fixed") {
          tagName = config.data?.release.tagFormat.replace(
            "${version}",
            version
          );
        } else {
          tagName = config.data.release.tagFormat
            .replace("${name}", packageName)
            .replace("${version}", version);
        }
      } else {
        throw new Error("Unknown repository type");
      }

      const tagMessage = `Release ${tagName}`;

      if (dryRun) {
        // If dry run, just return the tag name without creating it
        return {
          success: true,
          message: "Dry run: Tag creation skipped",
          data: tagName,
        };
      }

      // Create the tag using git client
      const createTagResult = await this.gitClient.createTag(
        tagName,
        tagMessage
      );
      if (!createTagResult.success) {
        throw new Error(createTagResult.message);
      }

      if (shouldPush) {
        // Push the tag to the remote repository
        const pushResult = await this.gitClient.pushTags();
        if (!pushResult.success) {
          throw new Error(pushResult.message);
        }
      }

      success = true;
      message = "Git tag created successfully";
      dataResult = tagName;
    } catch (error) {
      success = false;
      message = "Failed to create git tag";

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
  // #endregion - @createTag
}

export default ReleaseService;
