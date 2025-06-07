import { z } from "zod/v4";

import { packageJsonSchema } from "@/schemas/packageJsonSchema";

/**
 * Schema for validating a monorepo configuration.
 * Currently empty, can be extended with specific monorepo settings.
 */
export const monorepoProjectConfigSchema = z.object({
  release: z.object({
    tagFormat: z.string().regex(/^.*\$\{version\}.*$/, {
      error: "Tag format must include ${version} placeholder",
    }),
    versioningStrategy: z.enum(["fixed", "independent"], {
      error: "Versioning strategy must be either 'fixed' or 'independent'",
    }),
  }),
  workspaces: z
    .array(z.string().min(1), {
      error: "Workspaces must be an array of non-empty strings",
    })
    .min(1),
  repoType: z.enum(["monorepo", "single"], {
    error: "Repository type must be either 'monorepo' or 'single'",
  }),
});

/**
 * Schema for validating a monorepo root package.json configuration.
 * Combines package.json schema with default configuration schema and adds
 * specific fields for monorepo management.
 */
export const monorepoProjectRootPackageJsonSchema = z.object({
  ...packageJsonSchema.shape,
  ...monorepoProjectConfigSchema.shape,
});

/**
 * Schema for validating a package.json configuration within a monorepo.
 * Combines package.json schema with specific publish configuration.
 */
export const monorepoProjectPackageJsonSchema = z.object({
  ...packageJsonSchema.shape,
});
