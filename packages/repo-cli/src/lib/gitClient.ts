/**
 * @name GitClient
 * @file src/lib/gitClient.ts
 * @description Class to manage git operations and repository information
 */

import type { Formatter } from "picocolors/types";
import simpleGit, {
  type CommitResult,
  type StatusResult,
  type SimpleGit,
} from "simple-git";
import colors from "picocolors";

import type { Commit, FunctionResultPromise } from "@/types";

class GitClient {
  private client: SimpleGit;

  constructor() {
    this.client = simpleGit(process.cwd());
  }

  // #region - @checkIsRepo
  /**
   * @returns A promise that resolves to a FunctionResult indicating success or failure.
   * @description Checks if the current directory is a git repository.
   */
  public async checkIsRepo(): FunctionResultPromise {
    let success: boolean;
    let message: string;

    try {
      success = await this.client.checkIsRepo();
      message = "Checked if directory is a git repository successfully";
    } catch (error) {
      success = false;
      message = "Failed to check if directory is a git repository";
    }

    return {
      success,
      message,
    };
  }
  // #endregion - @checkIsRepo

  // #region - @getCurrentBranch
  /**
   * @returns A promise that resolves to the current branch name.
   * @description Retrieves the current branch name of the git repository.
   */
  public async getCurrentBranch(): FunctionResultPromise<string | null> {
    let success: boolean = false;
    let message: string = "";
    let data: string | null = null;

    try {
      const branchSummary = await this.client.branch();
      success = true;
      message = "Current branch retrieved successfully";
      data = branchSummary.current;
    } catch (error) {
      success = false;
      message = "Failed to get current branch";
    }

    return {
      success,
      message,
      data,
    };
  }
  // #endregion - @getCurrentBranch

  // #region - @getRemoteUrl
  /**
   * @returns A promise that resolves to the remote URL of the repository.
   * @description Retrieves the remote URL of the git repository.
   */
  public async getRemoteUrl(): FunctionResultPromise<string | null> {
    let success: boolean = false;
    let message: string = "";
    let data: string | null = null;

    try {
      const remotes = await this.client.getRemotes(true);
      if (remotes.length === 0) {
        throw new Error("No remotes found");
      }

      success = true;
      message = "Remote URL retrieved successfully";
      data = remotes[0].refs.fetch; // Return the fetch URL of the first remote
    } catch (error) {
      success = false;
      message = "Failed to get remote URL";
    }

    return {
      success,
      message,
      data,
    };
  }
  // #endregion - @getRemoteUrl

  // #region - @getStatus
  /**
   * @returns A promise that resolves to the status of the repository.
   * @description Retrieves the status of the git repository, including staged, unstaged, and untracked files.
   */
  public async getStatus(): FunctionResultPromise<StatusResult | null> {
    let success: boolean = false;
    let message: string = "";
    let data: StatusResult | null = null;

    try {
      const status = await this.client.status();
      success = true;
      message = "Repository status retrieved successfully";
      data = status;
    } catch (error) {
      success = false;
      message = "Failed to get repository status";
    }

    return {
      success,
      message,
      data,
    };
  }
  // #endregion - @getStatus

  // #region - @getCommits
  /**
   * @returns A promise that resolves to a list of commits in the repository.
   * @description Retrieves the commit history of the git repository.
   */
  public async getCommits(): FunctionResultPromise<Commit[] | null> {
    let success: boolean = false;
    let message: string = "";
    let data: Commit[] | null = null;

    try {
      const log = await this.client.log();
      if (!log.all || log.all.length === 0) {
        throw new Error("No commits found");
      }

      success = true;
      message = "Commits retrieved successfully";
      data = log.all.map((commit) => ({
        ...commit,
        message: commit.message,
      }));
    } catch (error) {
      success = false;
      message = `Failed to get commits: ${error instanceof Error ? error.message : String(error)}`;
    }

    return {
      success,
      message,
      data,
    };
  }
  // #endregion - @getCommits

  // #region - @getOwnerAndRepo
  /**
   * @returns A promise that resolves to the owner and repository name from the remote URL.
   * @description Extracts the owner and repository name from the remote URL of the git repository.
   */
  public async getOwnerAndRepo(): FunctionResultPromise<{
    owner: string;
    repo: string;
  } | null> {
    let success: boolean = false;
    let message: string = "";
    let data: { owner: string; repo: string } | null = null;

    try {
      const remoteUrl = await this.getRemoteUrl();
      if (!remoteUrl.success || !remoteUrl.data) {
        throw new Error(remoteUrl.message);
      }

      const match = remoteUrl.data.match(/github\.com[:/](.+)\/(.+)(\.git)?$/);
      if (!match) {
        throw new Error("Invalid remote URL format");
      }

      success = true;
      message = "Owner and repository name retrieved successfully";
      data = { owner: match[1], repo: match[2] };
    } catch (error) {
      success = false;
      message = `Failed to get owner and repository name: ${error instanceof Error ? error.message : String(error)}`;
    }

    return {
      success,
      message,
      data,
    };
  }
  // #endregion - @getOwnerAndRepo

  // #region - @checkHasChanges
  /**
   * @returns A promise that resolves to a boolean indicating if there are changes in the repository.
   * @description Checks if there are any changes in the git repository.
   */
  public async checkHasChanges(): FunctionResultPromise<boolean> {
    let success: boolean = false;
    let message: string = "";
    let data: boolean = false;

    try {
      const status = await this.getStatus();
      if (!status || !status.data) {
        throw new Error("Failed to retrieve status or no files found");
      }

      data = status.data.files.length > 0 || status.data.not_added.length > 0;
      success = true;
      message = "Checked for changes successfully";
    } catch (error) {
      success = false;
      message = `Failed to check for changes: ${error instanceof Error ? error.message : String(error)}`;
    }

    return {
      success,
      message,
      data,
    };
  }
  // #endregion - @checkHasChanges

  // #region - @getChanges
  /**
   * @returns A promise that resolves to a FunctionResult containing the changes in the repository.
   * @description Retrieves the changes in the git repository, including staged, unstaged, and untracked files.
   */
  public async getChanges(): FunctionResultPromise<StatusResult | null> {
    let success: boolean = false;
    let message: string = "";
    let data: StatusResult | null = null;

    try {
      const status = await this.getStatus();
      if (!status || !status.data) {
        throw new Error("Failed to retrieve status or no files found");
      }

      data = status.data;
      success = true;
      message = "Changes retrieved successfully";
    } catch (error) {
      success = false;
      message = `Failed to get changes: ${error instanceof Error ? error.message : String(error)}`;
    }

    return {
      success,
      message,
      data,
    };
  }
  // #endregion - @getChanges

  // #region - @addFiles
  /**
   * @param files - An array of file paths to add to the staging area.
   * @returns A promise that resolves to a FunctionResult indicating success or failure.
   * @description Adds specified files to the staging area of the git repository.
   */
  public async addFiles(files: string[]): FunctionResultPromise {
    let success: boolean = false;
    let message: string = "";

    try {
      await this.client.add(files);
      success = true;
      message = "Files added to staging area successfully";
    } catch (error) {
      success = false;
      message = `Failed to add files: ${error instanceof Error ? error.message : String(error)}`;
    }

    return {
      success,
      message,
    };
  }
  // #endregion - @addFiles

  // #region - @commitChanges
  /**
   * @param message - The commit message.
   * @returns A promise that resolves to a FunctionResult indicating success or failure.
   * @description Commits the staged changes in the git repository with the provided commit message.
   */
  public async commitChanges({
    type: commitType,
    message: commitMessage,
    body: commitBody,
    scope: commitScope,
  }: {
    type: string;
    message: string;
    body?: string;
    scope?: string;
  }): FunctionResultPromise<CommitResult | null> {
    let success: boolean = false;
    let message: string = "";
    let data: CommitResult | null = null;

    try {
      const commit = await this.client.commit(
        this.constructCommitMessage(
          commitType,
          commitScope,
          commitMessage,
          commitBody
        )
      );
      if (!commit || !commit.commit) {
        throw new Error("Commit failed or no commit data returned");
      }
      success = true;
      message = "Changes committed successfully";
      data = commit;
    } catch (error) {
      success = false;
      message = `Failed to commit changes: ${error instanceof Error ? error.message : String(error)}`;
    }

    return {
      success,
      message,
      data,
    };
  }
  // #endregion - @commitChanges

  // #region - @pushChanges
  /**
   * @returns A promise that resolves to a FunctionResult indicating success or failure.
   * @description Pushes the committed changes to the remote repository.
   */
  public async pushChanges(): FunctionResultPromise {
    let success: boolean = false;
    let message: string = "";

    try {
      await this.client.push();
      success = true;
      message = "Changes pushed to remote repository successfully";
    } catch (error) {
      success = false;
      message = `Failed to push changes: ${error instanceof Error ? error.message : String(error)}`;
    }

    return {
      success,
      message,
    };
  }
  // #endregion - @pushChanges

  // #region - @getCommitMessage
  /**
   * Gets the console color and label for a given change type.
   * @param type - The type of change (e.g., "a" for added, "m" for modified, "d" for deleted, "r" for renamed).
   * @description Returns the console color and label for the specified change type.
   * @returns An object containing the console color and label.
   */
  public getChangeInfo = (
    type: string
  ): {
    consoleColor: Formatter;
    label: string;
  } => {
    let consoleColor: Formatter;
    let label: string;

    switch (type.toLocaleLowerCase()) {
      case "a":
        consoleColor = colors.green;
        label = "Added";
        break;
      case "m":
        consoleColor = colors.blue;
        label = "Modified";
        break;
      case "d":
        consoleColor = colors.red;
        label = "Deleted";
        break;
      case "r":
        consoleColor = colors.yellow;
        label = "Renamed";
        break;
      case "?":
        consoleColor = colors.cyan;
        label = "Untracked";
        break;
      default:
        consoleColor = colors.white;
        label = "Unknown";
    }

    return { consoleColor, label };
  };
  // #endregion - @getCommitMessage

  // #region - @constructCommitMessage
  /**
   * Constructs a commit message.
   * @param type - The type of change (e.g., "feat", "fix").
   * @param scope - The scope of the change (e.g., "ui", "api").
   * @param message - The short description of the change.
   * @param body - The detailed description of the change.
   * @returns The constructed commit message.
   */
  private constructCommitMessage = (
    type: string,
    scope?: string,
    message?: string,
    body?: string
  ): string => {
    let commitMsg = "";
    if (type) {
      commitMsg += `${type}`;
    }
    if (scope) {
      commitMsg += `(${scope})`;
    }
    if (message) {
      commitMsg += `: ${message}`;
    }
    if (body) {
      commitMsg += `\n\n${body}`;
    }
    return commitMsg;
  };
  // #endregion - @constructCommitMessage
}

export default GitClient;
