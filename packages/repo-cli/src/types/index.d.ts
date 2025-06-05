import { z } from "zod/v4-mini";
import type { DefaultLogFields, ListLogLine } from "simple-git";

import {
  singleProjectConfigSchema,
  singleProjectPackageJsonSchema,
} from "@/schemas/providers/singleProjectSchemas";

import {
  monorepoProjectConfigSchema,
  monorepoProjectRootPackageJsonSchema,
  monorepoProjectPackageJsonSchema,
} from "@/schemas/providers/monorepoProjectSchemas";

/**
 * The configuration tool schema for the repository.
 */
export type ConfigTool = SingleProjectConfig | MonorepoProjectConfig;

/**
 * A commit object that includes default log fields and a list log line.
 */
export type Commit = DefaultLogFields & ListLogLine;

/**
 * The result type for functions that return a success or failure message.
 */
export type FunctionResult<T = { [key: string]: string }> = Promise<{
  success: boolean;
  message: string;
  data?: T; // Optional data returned on success
}>;

// #region Single Projects
/**
 * The configuration schema for single projects.
 */
export type SingleProjectConfig = z.infer<typeof singleProjectConfigSchema>;

/**
 * The package.json schema for single projects.
 */
export type SingleProjectPackageJson = z.infer<
  typeof singleProjectPackageJsonSchema
>;
// #endregion

// #region Monorepo Projects
/**
 * The configuration schema for monorepo projects.
 */
export type MonorepoProjectConfig = z.infer<typeof monorepoProjectConfigSchema>;

/**
 * The package.json schema for monorepo root projects.
 */
export type MonorepoProjectRootPackageJson = z.infer<
  typeof monorepoProjectRootPackageJsonSchema
>;

/**
 * The package.json schema for monorepo packages.
 */
export type MonorepoProjectPackageJson = z.infer<
  typeof monorepoProjectPackageJsonSchema
>;
// #endregion
