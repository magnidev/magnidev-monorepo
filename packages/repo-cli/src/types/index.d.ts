import { z } from "zod/v4-mini";

import {
  singleProjectConfigSchema,
  singleProjectPackageJsonSchema,
} from "@/schemas/providers/singleProject";

import {
  monorepoProjectConfigSchema,
  monorepoProjectRootPackageJsonSchema,
  monorepoProjectPackageJsonSchema,
} from "@/schemas/providers/monorepoProject";

/**
 * The configuration tool schema for the repository.
 */
export type ConfigTool = SingleProjectConfig | MonorepoProjectConfig;

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
