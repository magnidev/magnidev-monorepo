import { z } from "zod/v4";

import {
  singleConfigSchema,
  singlePackageJsonSchema,
} from "@schemas/providers/singleSchemas";

/**
 * @description The configuration schema for single projects.
 */
export type SingleConfig = z.infer<typeof singleConfigSchema>;

/**
 * @description The package.json schema for single projects.
 */
export type SinglePackageJson = z.infer<typeof singlePackageJsonSchema>;
