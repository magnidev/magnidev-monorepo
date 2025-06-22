/**
 * @description Type representing the repository type.
 */
export type RepoType = "single" | "monorepo";

/**
 * @description Type representing the result of a repository type check.
 */
export type RepoTypeResult = RepoType | null;

/**
 * @description Type representing the repository information.
 */
export type RepoInfo = {
  repoType: RepoType;
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
