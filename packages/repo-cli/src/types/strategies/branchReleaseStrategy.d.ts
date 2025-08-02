/**
 * @description Type definition for data used in a branch release operation.
 */
export type BranchReleaseData = {
  releaseNotes: string;
  packageName?: string;
  version: string;
};

/**
 * @description Type definition for options used in a branch release operation.
 */
export type BranchReleaseOptions = {
  shouldPush?: boolean;
  dryRun?: boolean;
};

/**
 * @description Type definition for the result of a branch release operation.
 */
export type BranchReleaseResult = {
  branchName: string;
  releaseNotes: string;
  packagePath?: string;
  previousVersion?: string;
} | null;
