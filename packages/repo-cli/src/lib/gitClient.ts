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
  type TagResult,
} from "simple-git";
import colors from "picocolors";

import type { FunctionResultPromise } from "@/types";
import type { Commit } from "@/types/gitClient";

class GitClient {
  private client: SimpleGit;

  constructor() {
    this.client = simpleGit(process.cwd());
  }

  // #region - @checkIsRepo
  /**
   * @description Checks if the current directory is a git repository.
   * @returns {FunctionResultPromise} A promise that resolves to an object indicating success or failure.
   */
  public async checkIsRepo(): FunctionResultPromise {
    let success: boolean = false;
    let message: string = "";

    try {
      const isRepo = await this.client.checkIsRepo();
      if (!isRepo) {
        throw new Error("Current directory is not a git repository");
      }

      success = true;
      message = "Current directory is a git repository";
    } catch (error: any) {
      success = false;
      message = "Failed to check if current directory is a git repository";

      if (error instanceof Error) {
        message = error.message;
      }
    }

    return {
      success,
      message,
    };
  }
  // #endregion - @checkIsRepo

  // #region - @getCurrentBranch
  /**
   * @description Retrieves the current branch name of the git repository.
   * @returns {FunctionResultPromise<string | null>} A promise that resolves to the current branch name.
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
    } catch (error: any) {
      success = false;
      message = "Failed to get current branch";

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
  // #endregion - @getCurrentBranch

  // #region - @getRemoteUrl
  /**
   * @description Retrieves the remote URL of the git repository.
   * @returns {FunctionResultPromise<string | null>} A promise that resolves to the remote URL or null if not found.
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
    } catch (error: any) {
      success = false;
      message = "Failed to get remote URL";

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
  // #endregion - @getRemoteUrl

  // #region - @getStatus
  /**
   * @description Retrieves the status of the git repository, including staged, unstaged, and untracked files.
   * @returns {FunctionResultPromise<StatusResult | null>} A promise that resolves to the status of the repository.
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
    } catch (error: any) {
      success = false;
      message = "Failed to get repository status";

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
  // #endregion - @getStatus

  // #region - @getCommits
  /**
   * @description Retrieves the commit history of the git repository.
   * @returns {FunctionResultPromise<Commit[] | null>} A promise that resolves to an array of commits or null if no commits are found.
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
    } catch (error: any) {
      success = false;
      message = "Failed to get commits";

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
  // #endregion - @getCommits

  // #region - @getCommitFiles
  /**
   * @description Gets the list of files changed in a specific commit.
   * @param commitHash The hash of the commit.
   * @returns {FunctionResultPromise<string[] | null>} A promise that resolves to an array of file paths changed in the commit.
   */
  public async getCommitFiles(
    commitHash: string
  ): FunctionResultPromise<string[] | null> {
    let success: boolean = false;
    let message: string = "";
    let data: string[] | null = null;

    try {
      // Get the files changed in this commit using git show
      const filesOutput = await this.client.raw([
        "show",
        "--pretty=format:",
        "--name-only",
        commitHash,
      ]);

      const files = filesOutput
        .split("\n")
        .filter((line) => line.trim() !== "")
        .map((file) => file.trim());

      success = true;
      message = "Commit files retrieved successfully.";
      data = files;
    } catch (error) {
      success = false;
      message = "Failed to get commit files";

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
  // #endregion - @getCommitFiles

  // #region - @getOwnerAndRepo
  /**
   * @description Retrieves the owner and repository name from the remote URL.
   * @returns {FunctionResultPromise<{ owner: string; repo: string } | null>} A promise that resolves to an object containing the owner and repository name or null if not found.
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
      data = { owner: match[1], repo: match[2].replace(/\.git$/, "") }; // Remove .git if present
    } catch (error) {
      success = false;
      message = "Failed to get owner and repository name";

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
  // #endregion - @getOwnerAndRepo
  // #region - @checkHasChanges
  /**
   * @description Checks if there are any changes in the git repository.
   * @returns {FunctionResultPromise} A promise that resolves to a boolean indicating if there are changes.
   */
  public async checkHasChanges(): FunctionResultPromise<StatusResult | null> {
    let success: boolean = false;
    let message: string = "";
    let data: StatusResult | null = null;

    try {
      const changes = await this.getChanges();
      if (!changes.success || !changes.data) {
        throw new Error(changes.message);
      }

      const hasChanges: boolean = changes.data.files.length > 0;

      if (!hasChanges) {
        throw new Error("There are no changes in the repository");
      }

      success = true;
      message = "There are changes in the repository";
      data = changes.data;
    } catch (error: any) {
      success = false;
      message = "No changes detected";

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
  // #endregion - @checkHasChanges

  // #region - @getChanges
  /**
   * @description Retrieves the changes in the git repository.
   * @returns {FunctionResultPromise<StatusResult | null>} A promise that resolves to the status of the repository or null if no changes are found.
   */
  public async getChanges(): FunctionResultPromise<StatusResult | null> {
    let success: boolean = false;
    let message: string = "";
    let data: StatusResult | null = null;

    try {
      const status = await this.getStatus();
      if (!status.success || !status.data) {
        throw new Error("Failed to retrieve status or no files found");
      }

      success = true;
      message = "Changes retrieved successfully";
      data = status.data;
    } catch (error) {
      success = false;
      message = "Failed to get changes";

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
  // #endregion - @getChanges

  // #region - @addFiles
  /**
   * @description Adds files to the staging area in the git repository.
   * @param files An array of file paths to add to the staging area.
   * @returns {FunctionResultPromise} A promise that resolves to a FunctionResultPromise indicating success or failure.
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
      message = "Failed to add files";

      if (error instanceof Error) {
        message = error.message;
      }
    }

    return {
      success,
      message,
    };
  }
  // #endregion - @addFiles

  // #region - @commitChanges
  /**
   * @description Commits the staged changes in the git repository.
   * @param type The type of change (e.g., "feat", "fix").
   * @param message The short description of the change.
   * @param body The detailed description of the change (optional).
   * @param scope The scope of the change (optional).
   * @returns {FunctionResultPromise<CommitResult | null>} A promise that resolves to the commit result or null if the commit fails.
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
      message = "Failed to commit changes";

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
  // #endregion - @commitChanges

  // #region - @resetChanges
  /**
   * @description Resets the changes in the git repository, reverting to the last commit.
   * @returns {FunctionResultPromise} A promise that resolves to a FunctionResultPromise indicating success or failure.
   */
  public async resetChanges(): FunctionResultPromise {
    let success: boolean = false;
    let message: string = "";

    try {
      await this.client.reset();
      success = true;
      message = "Changes reset successfully";
    } catch (error) {
      success = false;
      message = "Failed to reset changes";

      if (error instanceof Error) {
        message = error.message;
      }
    }

    return {
      success,
      message,
    };
  }
  // #endregion - @resetChanges

  // #region - @pushChanges
  /**
   * @description Pushes the committed changes to the remote repository.
   * @returns {FunctionResultPromise} A promise that resolves to a FunctionResultPromise indicating success or failure.
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
      message = "Failed to push changes";

      if (error instanceof Error) {
        message = error.message;
      }
    }

    return {
      success,
      message,
    };
  }
  // #endregion - @pushChanges

  // #region - @createTag
  /**
   * @description Creates a tag in the git repository.
   * @param tagName The name of the tag to create.
   * @param message The message associated with the tag (optional).
   * @returns {FunctionResultPromise} A promise that resolves to a FunctionResultPromise indicating success or failure.
   */
  public async createTag(
    tagName: string,
    tagMessage: string
  ): FunctionResultPromise {
    let success: boolean = false;
    let message: string = "";

    try {
      await this.client.addAnnotatedTag(tagName, tagMessage);

      success = true;
      message = "Tag created successfully";
    } catch (error) {
      success = false;
      message = "Failed to create tag";

      if (error instanceof Error) {
        message = error.message;
      }
    }

    return {
      success,
      message,
    };
  }
  // #endregion - @createTag

  // #region - @pushTags
  /**
   * @description Pushes tags to the remote repository.
   * @returns {FunctionResultPromise} A promise that resolves to a FunctionResultPromise indicating success or failure.
   */
  public async pushTags(): FunctionResultPromise {
    let success: boolean = false;
    let message: string = "";

    try {
      await this.client.pushTags();

      success = true;
      message = "Tags pushed to remote repository successfully";
    } catch (error) {
      success = false;
      message = "Failed to push tags";

      if (error instanceof Error) {
        message = error.message;
      }
    }

    return {
      success,
      message,
    };
  }
  // #endregion - @pushTags

  // #region - @getTags
  /**
   * @description Retrieves all tags from the repository.
   * @returns {FunctionResultPromise<string[]>} A promise that resolves to an array of tag names.
   */
  public async getTags(): FunctionResultPromise<TagResult | null> {
    let success: boolean = false;
    let message: string = "";
    let data: TagResult | null = null;

    try {
      const tags = await this.client.tags();
      if (!tags.all || tags.all.length === 0) {
        throw new Error("No tags found in repository");
      }

      success = true;
      message = "Tags retrieved successfully";
      data = tags;
    } catch (error) {
      success = false;
      message = "Failed to retrieve tags";

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
  // #endregion - @getTags

  // #region - @getCommitsSinceLatestTag
  /**
   * @description Retrieves commits since the latest tag or since a specific tag.
   * @returns {FunctionResultPromise<Commit[] | null>} A promise that resolves to commits since the tag.
   */
  public async getCommitsSinceLatestTag(): FunctionResultPromise<
    Commit[] | null
  > {
    let success: boolean = false;
    let message: string = "";
    let data: Commit[] | null = null;

    try {
      // Verify if the provided tag exists
      const tags = await this.getTags();
      if (!tags.success || !tags.data) {
        throw new Error(tags.message);
      }

      const tagName = tags.data.latest;

      // Get commits since the tag
      const log = await this.client.log({
        from: tagName,
        to: "HEAD",
      });

      if (!log.all || log.all.length === 0) {
        success = true;
        message = `No commits found since tag '${tagName}'`;
        data = [];
      } else {
        success = true;
        message = `Found ${log.all.length} commit(s) since tag '${tagName}'`;
        data = log.all.map((commit) => ({
          ...commit,
          message: commit.message,
        }));
      }
    } catch (error) {
      success = false;
      message = "Failed to retrieve commits since latest tag";

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
  // #endregion - @getCommitsSinceLatestTag

  // #region - @getCommitsSinceTag
  /**
   * @description Retrieves commits since a specific tag.
   * @param tagName The name of the tag to get commits since.
   * @returns {FunctionResultPromise<Commit[] | null>} A promise that resolves to commits since the tag.
   */
  public async getCommitsSinceTag(
    tagName: string
  ): FunctionResultPromise<Commit[] | null> {
    let success: boolean = false;
    let message: string = "";
    let data: Commit[] | null = null;

    try {
      // Verify if the provided tag exists
      const tags = await this.getTags();
      if (!tags.success || !tags.data) {
        throw new Error(tags.message);
      }

      if (!tags.data.all.includes(tagName)) {
        throw new Error(`Tag '${tagName}' not found`);
      }

      // Get commits since the tag
      const log = await this.client.log({
        from: tagName,
        to: "HEAD",
      });

      if (!log.all || log.all.length === 0) {
        success = true;
        message = `No commits found since tag '${tagName}'`;
        data = [];
      } else {
        success = true;
        message = `Found ${log.all.length} commit(s) since tag '${tagName}'`;
        data = log.all.map((commit) => ({
          ...commit,
          message: commit.message,
        }));
      }
    } catch (error) {
      success = false;
      message = "Failed to retrieve commits since tag";

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
  // #endregion - @getCommitsSinceTag

  // #region - @getCommitByHash
  /**
   * @description Retrieves a commit by its hash.
   * @param commitHash The hash of the commit to retrieve.
   * @returns {FunctionResultPromise<Commit | null>} A promise that resolves to the commit object or null if not found.
   */
  public async getCommitByHash(
    commitHash: string
  ): FunctionResultPromise<Commit | null> {
    let success: boolean = false;
    let message: string = "";
    let data: Commit | null = null;

    try {
      const log = await this.client.log({
        from: commitHash,
        to: commitHash,
      });

      if (!log.all || log.all.length === 0) {
        success = true;
        message = `No commit found with hash '${commitHash}'`;
        data = null;
      } else {
        success = true;
        message = `Found commit with hash '${commitHash}'`;
        data = log.all[0];
      }
    } catch (error) {
      success = false;
      message = "Failed to retrieve commit by hash";

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
  // #endregion - @getCommitByHash

  // #region - @getChangeInfo
  /**
   * @description Returns the console color and label for a given change type.
   * @param type - The type of change (e.g., "a" for added, "m" for modified).
   * @returns {consoleColor: Formatter; label: string;} An object containing the console color and label for the change type.
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
  // #endregion - @getChangeInfo

  // #region - @constructCommitMessage
  /**
   * @description Constructs a commit message based on the provided type, scope, message, and body.
   * @param type The type of change (e.g., "feat", "fix").
   * @param scope The scope of the change (optional).
   * @param message The short description of the change (optional).
   * @param body The detailed description of the change (optional).
   * @returns {string} The constructed commit message.
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

  // #region - @createBranch
  /**
   * @description Creates and checks out a new branch.
   * @param branchName The name of the branch to create.
   * @returns {FunctionResultPromise} A promise that resolves to a FunctionResult indicating success or failure.
   */
  public async createBranch(branchName: string): FunctionResultPromise {
    let success: boolean = false;
    let message: string = "";

    try {
      await this.client.checkoutLocalBranch(branchName);

      success = true;
      message = `Branch '${branchName}' created and checked out successfully`;
    } catch (error) {
      success = false;
      message = "Failed to create branch";

      if (error instanceof Error) {
        message = error.message;
      }
    }

    return {
      success,
      message,
    };
  }
  // #endregion - @createBranch

  // #region - @pushBranch
  /**
   * @description Pushes a branch to the remote repository.
   * @param branchName The name of the branch to push.
   * @returns {FunctionResultPromise} A promise that resolves to a FunctionResult indicating success or failure.
   */
  public async pushBranch(branchName: string): FunctionResultPromise {
    let success: boolean = false;
    let message: string = "";

    try {
      await this.client.push("origin", branchName);

      success = true;
      message = `Branch '${branchName}' pushed to remote repository successfully`;
    } catch (error) {
      success = false;
      message = "Failed to push branch";

      if (error instanceof Error) {
        message = error.message;
      }
    }

    return {
      success,
      message,
    };
  }
  // #endregion - @pushBranch
}

export default GitClient;
