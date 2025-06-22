import { z } from "zod/v4-mini";
import type { DefaultLogFields, ListLogLine } from "simple-git";

import {
  monorepoConfigSchema,
  monorepoRootPackageJsonSchema,
  monorepoPackageJsonSchema,
} from "@schemas/providers/monorepoSchemas";

/**
 * @description The configuration schema for monorepo projects.
 */
export type MonorepoConfig = z.infer<typeof monorepoConfigSchema>;

/**
 * @description The package.json schema for monorepo root projects.
 */
export type MonorepoRootPackageJson = z.infer<
  typeof monorepoRootPackageJsonSchema
>;

/**
 * @description The package.json schema for monorepo packages.
 */
export type MonorepoPackageJson = z.infer<typeof monorepoPackageJsonSchema>;
