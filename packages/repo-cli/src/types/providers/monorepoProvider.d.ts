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
export type monorepoConfig = z.infer<typeof monorepoConfigSchema>;

/**
 * @description The package.json schema for monorepo root projects.
 */
export type monorepoRootPackageJson = z.infer<
  typeof monorepoRootPackageJsonSchema
>;

/**
 * @description The package.json schema for monorepo packages.
 */
export type monorepoPackageJson = z.infer<typeof monorepoPackageJsonSchema>;
