import { z } from "zod/v4";

import {
  singleProjectConfigSchema,
  singleProjectPackageJsonSchema,
} from "@/schemas/providers/singleProjectSchemas";

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
