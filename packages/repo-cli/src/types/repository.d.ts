/**
 * @description Type representing the repository information.
 */
export type RepoInfo = {
  repoType: "single" | "monorepo";
  currentBranch: string;
  remoteUrl: string;
  owner: string;
  repo: string;
  changes?: {
    behind: number;
    ahead: number;
    files: string[];
  };
};

/**
 * @description Type representing the versioning strategy for a repository.
 */
export type VersionType = "patch" | "minor" | "major" | "prerelease";
