import prompts from "@clack/prompts";

/**
 * Handles the cancellation of a command flow.
 * @param {string} [message] - Optional message to display on cancellation.
 * This function uses the `prompts` library to display a cancellation message.
 */
export function onCommandFlowCancel(message?: string): void {
  prompts.cancel(message || "Operation cancelled.");
  process.exit(1); // Exit the process with an error code
}

/**
 * Handles errors in the command flow.
 * @param {Error} error - The error object containing the error message.
 * This function handles errors in the command flow by calling `onCommandFlowCancel`
 * with the error message and then exits the process with an error code.
 */
export function onCommandFlowError(error: any): void {
  const message = error instanceof Error ? error.message : String(error);
  onCommandFlowCancel(message);
}
