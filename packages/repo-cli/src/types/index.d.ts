import { z } from "zod/v4-mini";

/**
 * @description The result type for functions that return a success or failure message.
 */
export type FunctionResult<T = { [key: string]: string }> = {
  success: boolean;
  message: string;
  data?: T; // Optional data returned on success
};

/**
 * @description The options for a function, which can include additional parameters.
 */
export type FunctionResultPromise<T = { [key: string]: string }> = Promise<
  FunctionResult<T>
>;
