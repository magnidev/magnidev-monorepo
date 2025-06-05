/**
 * @name GitClient
 * @file src/lib/gitClient.ts
 * @description Class to manage git operations and repository information
 */

import type { Commit, FunctionResult } from "@/types";
import simpleGit, { StatusResult, type SimpleGit } from "simple-git";

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
  public async checkIsRepo(): Promise<FunctionResult> {
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
  public async getCurrentBranch(): Promise<FunctionResult<string | null>> {
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
  public async getRemoteUrl(): Promise<FunctionResult<string | null>> {
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
  public async getStatus(): Promise<StatusResult> {
    try {
      const status = await this.client.status();
      return status;
    } catch (error) {
      console.error("Error getting repository status:", error);
      throw new Error("Failed to get repository status");
    }
  }
  // #endregion - @getStatus

  // #region - @getCommits
  /**
   * @returns A promise that resolves to a list of commits in the repository.
   * @description Retrieves the commit history of the git repository.
   */
  public async getCommits(): Promise<FunctionResult<Commit[] | null>> {
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
  public async getOwnerAndRepo(): Promise<
    FunctionResult<{ owner: string; repo: string } | null>
  > {
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
  public async checkHasChanges(): Promise<FunctionResult<boolean>> {
    let success: boolean = false;
    let message: string = "";
    let data: boolean = false;

    try {
      const status = await this.getStatus();
      data = status.files.length > 0 || status.not_added.length > 0;
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
}

export default GitClient;
