import { z } from "zod/v4";

import {
  singleConfigSchema,
  singlePackageJsonSchema,
} from "@schemas/providers/singleSchemas";

/**
 * @description The configuration schema for single projects.
 */
export type singleConfig = z.infer<typeof singleConfigSchema>;

/**
 * @description The package.json schema for single projects.
 */
export type singlePackageJson = z.infer<typeof singlePackageJsonSchema>;
