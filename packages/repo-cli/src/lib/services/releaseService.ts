/**
 * @name ReleaseService
 * @file src/lib/services/releaseService.ts
 * @description Class to manage release information and configuration
 */

import semver from "semver";

import type { FunctionResult, FunctionResultPromise } from "@/types";
import type {
  CommitChangesResult,
  CreateTagResult,
  FilterCommitsResult,
  GroupCommitsByTypeResult,
  SuggestVersionsResult,
} from "@/types/services/releaseService";
import type { Commit } from "@/types/gitClient";
import RepositoryService from "@services/repositoryService";

class ReleaseService {
  private repositoryService: RepositoryService;
  private gitClient: RepositoryService["gitClient"];
  private monorepoProvider: RepositoryService["monorepoProvider"];
  private singleProvider: RepositoryService["singleProvider"];

  constructor(repositoryClient: RepositoryService) {
    if (!repositoryClient) {
      throw new Error("RepositoryService is required");
    }

    this.repositoryService = repositoryClient;
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

    const repositoryService = this.repositoryService;

    const repoType = await repositoryService.getRepoType();
    if (!repoType.success || !repoType.data) {
      throw new Error(repoType.message);
    }

    if (repoType.data === "monorepo") {
      const config = await repositoryService.monorepoProvider.getConfig();
      if (!config.success || !config.data) {
        throw new Error(config.message);
      }

      versionIdentifier = config.data?.release.preReleaseIdentifier;
    } else if (repoType.data === "single") {
      const config = await repositoryService.singleProvider.getConfig();
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
      data: dataResult,
    };
  }
  // #endregion - @commitChanges

  // #region - @createTag
  /**
   * @description Creates a new tag in the repository.
   * @param data The data containing the package name and version.
   * @returns A promise that resolves to a FunctionResult indicating success or failure.
   */
  public async createTag(
    data: { packageName?: string; version: string },
    options: {
      shouldPush?: boolean;
      dryRun?: boolean;
    }
  ): FunctionResultPromise<CreateTagResult> {
    let success: boolean = false;
    let message: string = "";
    let dataResult: CreateTagResult = null;

    const { packageName, version } = data;
    const { shouldPush, dryRun } = options;

    try {
      const repositoryService = this.repositoryService;

      const repoType = await repositoryService.getRepoType();
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
          if (!packageName) {
            throw new Error(
              "Package name is required for independent versioning"
            );
          }

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
          data: { tagName },
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
      dataResult = { tagName };
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

  // #region - @generateReleaseNotes
  /**
   * @description Generates release notes for the specified package and version.
   * @param data The data containing the tag name.
   * @returns The generated release notes.
   */
  public async generateReleaseNotes(data: {
    tagName: string;
  }): FunctionResultPromise<string> {
    let success: boolean = false;
    let message: string = "";
    let dataResult: string = "";

    const { tagName } = data;

    try {
      const repositoryService = this.repositoryService;

      const repoType = await repositoryService.getRepoType();
      if (!repoType.success || !repoType.data) {
        throw new Error(repoType.message);
      }

      const filteredCommits = await this.filterCommits();
      if (!filteredCommits.success || !filteredCommits.data) {
        throw new Error(filteredCommits.message);
      }

      const releaseNotes = [`\n## Changes in ${tagName}\n`];

      // Group commits by type for better organization
      const commitsByType = this.groupCommitsByType({
        commits: filteredCommits.data,
      });
      if (!commitsByType.success || !commitsByType.data) {
        throw new Error(commitsByType.message);
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
        "other",
      ];

      for (const type of typeOrder) {
        if (commitsByType.data[type] && commitsByType.data[type].length > 0) {
          const typeLabel = this.getTypeLabel(type);

          releaseNotes.push(`\n### ${typeLabel}`);
          releaseNotes.push("");

          for (const commit of commitsByType.data[type]) {
            const message = commit.message.split("\n")[0];
            const author = commit.author;
            // Remove conventional commit prefix if present
            const cleanMessage = message.replace(
              /^(feat|fix|docs|style|refactor|perf|test|chore)(\(.+?\))?:\s*/,
              ""
            );
            releaseNotes.push(
              `- ${cleanMessage}${author ? ` by ${author}` : ""}`
            );
          }
          releaseNotes.push(""); // Add empty line after each section
        }
      }

      success = true;
      message = "Release notes generated successfully";
      dataResult = releaseNotes.join("\n");
    } catch (error) {
      success = false;
      message = "Failed to generate release notes";

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
  // #endregion - @generateReleaseNotes

  // #region - @filterCommits
  public async filterCommits(): FunctionResultPromise<FilterCommitsResult> {
    let success: boolean = false;
    let message: string = "";
    let dataResult: FilterCommitsResult = null;

    try {
      const repositoryService = this.repositoryService;
      const gitClient = this.gitClient;

      const repoType = await repositoryService.getRepoType();
      if (!repoType.success || !repoType.data) {
        throw new Error(repoType.message);
      }

      if (repoType.data === "monorepo") {
        const monorepoProvider = this.monorepoProvider;

        const monorepoConfig = await monorepoProvider.getConfig();
        if (!monorepoConfig.success || !monorepoConfig.data) {
          throw new Error(monorepoConfig.message);
        }

        const versioningStrategy =
          monorepoConfig.data.release.versioningStrategy;

        if (versioningStrategy === "independent") {
          const allCommits = await gitClient.getCommits();
          if (!allCommits.success || !allCommits.data) {
            throw new Error(allCommits.message);
          }

          const tagsForPackage =
            await monorepoProvider.getTagsForPackage("@magnidev/repo-cli"); // TODO: Implement package name extraction

          if (tagsForPackage.success && tagsForPackage.data) {
            // if there are tags, filter commits since the latest tag
            const latestTag = tagsForPackage.data[0];

            const commitsSinceLatestTag =
              await gitClient.getCommitsSinceTag(latestTag);

            if (!commitsSinceLatestTag.success || !commitsSinceLatestTag.data) {
              throw new Error(commitsSinceLatestTag.message);
            }

            const commitsForPackage =
              await monorepoProvider.filterCommitsForPackage({
                commits: commitsSinceLatestTag.data,
                pkgName: `@magnidev/repo-cli`, // TODO: Implement package name extraction
              });

            if (!commitsForPackage.success || !commitsForPackage.data) {
              throw new Error(commitsForPackage.message);
            }

            dataResult = commitsForPackage.data;
          } else {
            // No tags found for package, return all commits for the package
            const commitsForPackage =
              await monorepoProvider.filterCommitsForPackage({
                commits: allCommits.data,
                pkgName: `@magnidev/repo-cli`, // TODO: Implement package name extraction
              });

            if (!commitsForPackage.success || !commitsForPackage.data) {
              throw new Error(commitsForPackage.message);
            }

            dataResult = commitsForPackage.data;
          }
        } else if (versioningStrategy === "fixed") {
          const commitsSinceLatestTag =
            await gitClient.getCommitsSinceLatestTag();

          if (commitsSinceLatestTag.success && commitsSinceLatestTag.data) {
            dataResult = commitsSinceLatestTag.data;
          } else {
            const commits = await this.gitClient.getCommits();
            if (!commits.success || !commits.data) {
              throw new Error(commits.message);
            }

            dataResult = commits.data;
          }
        }
      } else if (repoType.data === "single") {
        const commitsSinceLatestTag =
          await gitClient.getCommitsSinceLatestTag();

        if (commitsSinceLatestTag.success && commitsSinceLatestTag.data) {
          dataResult = commitsSinceLatestTag.data;
        } else {
          const commits = await this.gitClient.getCommits();
          if (!commits.success || !commits.data) {
            throw new Error(commits.message);
          }

          dataResult = commits.data;
        }
      }

      message = "Filtered commits retrieved successfully";
      success = true;
    } catch (error) {
      success = false;
      message = "Failed to filter commits";

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
  // #region - @filterCommits

  // #region - @groupCommitsByType
  /**
   * @description Groups commits by their conventional commit type.
   * @param data The commits to group.
   * @returns Commits grouped by type.
   */
  private groupCommitsByType(data: {
    commits: Commit[];
  }): FunctionResult<GroupCommitsByTypeResult> {
    let success: boolean = false;
    let message: string = "";
    let dataResult: GroupCommitsByTypeResult = {};

    const { commits } = data;

    try {
      const groups: GroupCommitsByTypeResult = {};

      for (const commit of commits) {
        const message = commit.message;
        const match = message.match(
          /^(feat|fix|docs|style|refactor|perf|test|chore)(\([^)]*\))?:/
        );

        let type = "other";
        if (match) {
          type = match[1];
        }

        if (!groups[type]) {
          groups[type] = [];
        }
        groups[type].push(commit);
      }

      success = true;
      message = "Commits grouped by type successfully";
      dataResult = groups;
    } catch (error) {
      success = false;
      message = "Failed to group commits by type";

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
  // #endregion - @groupCommitsByType

  // #region - @getTypeLabel
  /**
   * @description Gets a human-readable label for a commit type.
   * @param type The commit type.
   * @returns The human-readable label.
   */
  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      feat: "🚀 Features",
      fix: "🐛 Bug Fixes",
      perf: "⚡ Performance Improvements",
      refactor: "♻️ Code Refactoring",
      docs: "📚 Documentation",
      style: "💄 Styles",
      test: "🧪 Tests",
      chore: "🔧 Chores",
      other: "📝 Other Changes",
    };

    return labels[type] || "📝 Other Changes";
  }
  // #endregion - @getTypeLabel
}

export default ReleaseService;
