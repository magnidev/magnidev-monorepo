/**
 * @description Type representing the suggested version updates for a repository.
 */
export type SuggestVersionsResult = {
  patch: string | null;
  minor: string | null;
  major: string | null;
  prerelease: string | null;
};
