import type { DefaultLogFields, ListLogLine } from "simple-git";

/**
 * @description A commit object that includes default log fields and a list log line.
 */
export type Commit = DefaultLogFields & ListLogLine;
