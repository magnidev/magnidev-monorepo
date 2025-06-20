import { z } from "zod/v4";

import { packageJsonSchema } from "@/schemas/packageJsonSchema";

/**
 * Schema for validating a monorepo configuration.
 * Currently empty, can be extended with specific monorepo settings.
 */
export const monorepoProjectConfigSchema = z.object({
  release: z.object({
    tagFormat: z
      .string()
      .regex(/^.*\$\{version\}.*$/, {
        error: "Tag format must include ${version} placeholder.",
      })
      .default("${name}@${version}")
      .meta({
        description:
          "Format for release tags, must include `${version}` placeholder. For monorepos, you can use `${name}` as well. For fixed versioning, use 'v${version}'.",
      }),
    versioningStrategy: z
      .enum(["fixed", "independent"], {
        error: "Versioning strategy must be either 'fixed' or 'independent'",
      })
      .default("independent")
      .meta({
        description:
          "Versioning strategy for the repository. 'fixed' means all packages share the same version, 'independent' means each package can have its own version.",
      }),
    preReleaseIdentifier: z.string().default("canary").meta({
      description: "Identifier for pre-release versions. Default is 'canary'.",
    }),
  }),
  workspaces: z
    .array(
      z.string().regex(/^.*$/, {
        error: "Workspace paths must be relative or absolute.",
      })
    )
    .default(["packages/*"])
    .meta({
      description:
        "List of workspace paths for monorepo projects. Required for monorepos.",
    }),
  repoType: z
    .enum(["monorepo", "single"], {
      error: "Repository type must be either 'monorepo' or 'single'",
    })
    .default("monorepo"),
});

/**
 * Schema for validating a monorepo root package.json configuration.
 * Combines package.json schema with default configuration schema and adds
 * specific fields for monorepo management.
 */
export const monorepoProjectRootPackageJsonSchema = packageJsonSchema.extend(
  monorepoProjectConfigSchema.shape
);

/**
 * Schema for validating a package.json configuration within a monorepo.
 * Combines package.json schema with specific publish configuration.
 */
export const monorepoProjectPackageJsonSchema = packageJsonSchema.extend({
  publishConfig: z.object({
    access: z
      .enum(["public", "restricted"], {
        error: "Publish access must be either 'public' or 'restricted'",
      })
      .default("public"),
    registry: z
      .url({ error: "Registry must be a valid URL" })
      .default("https://registry.npmjs.org/"),
  }),
});
