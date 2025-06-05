/**
 * @name GitHubClient
 * @file src/lib/githubClient.ts
 * @description Class to manage GitHub operations and repository information
 */

import { Octokit } from "@octokit/rest";

class GitHubClient {
  public client: Octokit | null = null;

  constructor() {}

  // #region Init Client
  /**
   * @description Initializes the GitHub client with a personal access token.
   * @param token - The personal access token for GitHub API authentication.
   */
  private init(token: string) {
    this.client = new Octokit({ auth: token });
  }
  // #endregion

  // #region Get User Info
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
  // #endregion

  // #region Get Repo Info
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
  // #endregion

  // #region Create Release
  /**
   * @description Creates a new release for a repository.
   * @param owner - The owner of the repository.
   * @param repo - The name of the repository.
   * @param tagName - The name of the tag to create the release for.
   * @param releaseName - The name of the release.
   * @param body - The body content of the release.
   * @returns A promise that resolves to the created release information.
   */
  public async createRelease(
    owner: string,
    repo: string,
    tagName: string,
    releaseName: string,
    body: string
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
    });
    return response.data;
  }
  // #endregion

  // #region List Releases
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
  // #endregion

  // #region Delete Release
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
  // #endregion

  // #region Check Repo Exists
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
  // #endregion
}

export default GitHubClient;
