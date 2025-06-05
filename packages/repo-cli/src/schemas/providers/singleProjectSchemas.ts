import { z } from "zod/v4";

import { packageJsonSchema } from "@/schemas/packageJsonSchema";

/**
 * Schema for validating a single project configuration.
 */
export const singleProjectConfigSchema = z.object({
  release: z.object({
    tagFormat: z.string().regex(/^.*\$\{version\}.*$/, {
      error: "Tag format must include ${version} placeholder",
    }),
  }),
  publishConfig: z.object({
    access: z.enum(["public", "restricted"], {
      error: "Publish access must be either 'public' or 'restricted'",
    }),
    registry: z.url({ error: "Registry must be a valid URL" }).optional(),
  }),
});

/**
 * Schema for validating a single package.json configuration.
 * Combines package.json schema with default configuration schema.
 */
export const singleProjectPackageJsonSchema = z.object({
  ...packageJsonSchema.shape,
  ...singleProjectConfigSchema.shape,
});
