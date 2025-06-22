import { promisify } from "node:util";
import { exec } from "node:child_process";

// #region - @execAsync
/**
 * @description Executes a shell command asynchronously and returns a promise.
 * @param command - The shell command to execute.
 * @returns A promise that resolves with the command's output or rejects with an error.
 */
export const execAsync = promisify(exec);
// #endregion - @execAsync
