import prompts from "@clack/prompts";

/**
 *
 * @param message - The message to display when the operation is cancelled.
 * @description This function handles the cancellation of an operation by displaying a message.
 */
export function onCancel(message?: string): void {
  prompts.cancel(message || "Operation cancelled.");
  process.exit(1); // Exit the process with an error code
}
