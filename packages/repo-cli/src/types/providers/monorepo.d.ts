import { z } from "zod/v4-mini";
import type { DefaultLogFields, ListLogLine } from "simple-git";

import {
  monorepoProjectConfigSchema,
  monorepoProjectRootPackageJsonSchema,
  monorepoProjectPackageJsonSchema,
} from "@schemas/providers/monorepoSchemas";

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
