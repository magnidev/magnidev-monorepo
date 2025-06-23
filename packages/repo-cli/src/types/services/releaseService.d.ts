import type { Commit } from "@/types/gitClient";

/**
 * @description Type representing the suggested version updates for a repository.
 */
export type SuggestVersionsResult = {
  patch: string | null;
  minor: string | null;
  major: string | null;
  prerelease: string | null;
} | null;

/**
 * @description Type representing the result of committing changes to a repository.
 */
export type CommitChangesResult = { changes: string[] } | null;

/**
 * @description Type representing the result of creating a tag in a repository.
 */
export type CreateTagResult = {
  tagName: string;
} | null;

/**
 * @description Type representing the result of filtering commits based on a specific type.
 */
export type FilterCommitsResult = Commit[] | null;

/**
 * @description Type representing the result of grouping commits by their type.
 */
export type GroupCommitsByTypeResult = {
  [key: string]: any[];
};
