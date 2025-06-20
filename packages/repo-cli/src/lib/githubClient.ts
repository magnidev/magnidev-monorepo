/**
 * @name GitHubClient
 * @file src/lib/githubClient.ts
 * @description Class to manage GitHub operations and repository information
 */

import { Octokit } from "@octokit/rest";

import GitClient from "@lib/gitClient";

class GitHubClient {
  public client: Octokit | null = null;
  public gitClient: GitClient;

  constructor() {
    this.gitClient = new GitClient();
  }

  // #region - @init
  /**
   * @description Initializes the GitHub client with a personal access token.
   * @param token - The personal access token for GitHub API authentication.
   */
  public init(token: string) {
    this.client = new Octokit({ auth: token });
  }
  // #endregion - @init

  // #region - @getUserInfo
  /**
   * @description Retrieves the authenticated user's information.
   * @returns A promise that resolves to the user's information.
   */
  public async getUserInfo(): Promise<any> {
    if (!this.client) {
      throw new Error("GitHub client is not initialized");
    }
    const response = await this.client.users.getAuthenticated();
    return response.data;
  }
  // #endregion - @getUserInfo

  // #region - @getRepoInfo
  /**
   * @description Retrieves repository information by owner and repo name.
   * @param owner - The owner of the repository.
   * @param repo - The name of the repository.
   * @returns A promise that resolves to the repository information.
   */
  public async getRepoInfo(owner: string, repo: string): Promise<any> {
    if (!this.client) {
      throw new Error("GitHub client is not initialized");
    }
    const response = await this.client.repos.get({ owner, repo });
    return response.data;
  }
  // #endregion - @getRepoInfo
  // #region - @createRelease
  /**
   * @description Creates a new release for a repository.
   * @param owner - The owner of the repository.
   * @param repo - The name of the repository.
   * @param tagName - The name of the tag to create the release for.
   * @param releaseName - The name of the release.
   * @param body - The body content of the release.
   * @param prerelease - Whether this is a prerelease.
   * @returns A promise that resolves to the created release information.
   */
  public async createRelease(
    owner: string,
    repo: string,
    tagName: string,
    releaseName: string,
    body: string,
    prerelease: boolean = false
  ): Promise<any> {
    if (!this.client) {
      throw new Error("GitHub client is not initialized");
    }
    const response = await this.client.repos.createRelease({
      owner,
      repo,
      tag_name: tagName,
      name: releaseName,
      body,
      prerelease,
    });
    return response.data;
  }
  // #endregion - @createRelease

  // #region - @listReleases
  /**
   * @description Lists releases for a repository.
   * @param owner - The owner of the repository.
   * @param repo - The name of the repository.
   * @returns A promise that resolves to the list of releases.
   */
  public async listReleases(owner: string, repo: string): Promise<any> {
    if (!this.client) {
      throw new Error("GitHub client is not initialized");
    }
    const response = await this.client.repos.listReleases({
      owner,
      repo,
    });
    return response.data;
  }
  // #endregion - @listReleases

  // #region - @deleteRelease
  /**
   * @description Deletes a release by its ID.
   * @param owner - The owner of the repository.
   * @param repo - The name of the repository.
   * @param releaseId - The ID of the release to delete.
   * @returns A promise that resolves when the release is deleted.
   */
  public async deleteRelease(
    owner: string,
    repo: string,
    releaseId: number
  ): Promise<void> {
    if (!this.client) {
      throw new Error("GitHub client is not initialized");
    }
    await this.client.repos.deleteRelease({
      owner,
      repo,
      release_id: releaseId,
    });
  }
  // #endregion - @deleteRelease

  // #region - @checkRepoExists
  /**
   * @description Checks if a repository exists.
   * @param owner - The owner of the repository.
   * @param repo - The name of the repository.
   * @returns A promise that resolves to true if the repository exists, false otherwise.
   */
  public async repoExists(owner: string, repo: string): Promise<boolean> {
    if (!this.client) {
      throw new Error("GitHub client is not initialized");
    }
    try {
      await this.client.repos.get({ owner, repo });
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }
  // #endregion - @checkRepoExists

  // #region - @getCommitsByType
  /**
   * @description Groups commits by their conventional commit type.
   * @returns Commits grouped by type.
   */
  private async groupCommitsByType(): Promise<Record<string, any[]>> {
    const commits = await this.gitClient.getCommits();
    if (!commits || !commits.data) {
      throw new Error(commits.message);
    }

    const grouped: Record<string, any[]> = {};

    for (const commit of commits.data) {
      const message = commit.message;
      const match = message.match(
        /^(feat|fix|docs|style|refactor|perf|test|chore)(\([^)]*\))?:/
      );

      let type = "other";
      if (match) {
        type = match[1];
      }

      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(commit);
    }

    return grouped;
  }
  // #endregion - @getCommitsByType

  // #region - @getCommitTypeLabel
  /**
   * @description Gets a human-readable label for a commit type.
   * @param type The commit type.
   * @returns The human-readable label.
   */
  private getCommitTypeLabel(type: string): string {
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
  // #endregion - @getCommitTypeLabel
}

export default GitHubClient;
