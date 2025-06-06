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
import { CommandOptions } from "commander";

// #region Git
/**
 * @description A commit object that includes default log fields and a list log line.
 */
export type Commit = DefaultLogFields & ListLogLine;
// #endregion - Git

// #region Functions
/**
 * @description The result type for functions that return a success or failure message.
 */
export type FunctionResult<T = { [key: string]: string }> = Promise<{
  success: boolean;
  message: string;
  data?: T; // Optional data returned on success
}>;
// #endregion Functions

// #region Single Projects
/**
 * @description The configuration schema for single projects.
 */
export type SingleProjectConfig = z.infer<typeof singleProjectConfigSchema>;

/**
 * @description The package.json schema for single projects.
 */
export type SingleProjectPackageJson = z.infer<
  typeof singleProjectPackageJsonSchema
>;
// #endregion Single Projects

// #region Monorepo Projects
/**
 * @description The configuration schema for monorepo projects.
 */
export type MonorepoProjectConfig = z.infer<typeof monorepoProjectConfigSchema>;

/**
 * @description The package.json schema for monorepo root projects.
 */
export type MonorepoProjectRootPackageJson = z.infer<
  typeof monorepoProjectRootPackageJsonSchema
>;

/**
 * @description The package.json schema for monorepo packages.
 */
export type MonorepoProjectPackageJson = z.infer<
  typeof monorepoProjectPackageJsonSchema
>;
// #endregion Monorepo Projects
