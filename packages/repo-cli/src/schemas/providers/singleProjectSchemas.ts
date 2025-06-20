import { z } from "zod/v4";

import { packageJsonSchema } from "@/schemas/packageJsonSchema";

/**
 * Schema for validating a single project configuration.
 */
export const singleProjectConfigSchema = z.object({
  release: z.object({
    tagFormat: z
      .string()
      .regex(/^.*\$\{version\}.*$/, {
        error: "Tag format must include ${version} placeholder",
      })
      .default("v${version}")
      .meta({
        description:
          "Format for release tags, must include ${version} placeholder.",
      }),
    preReleaseIdentifier: z.string().default("canary").meta({
      description: "Identifier for pre-release versions. Default is 'canary'.",
    }),
  }),
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
  repoType: z
    .enum(["monorepo", "single"], {
      error: "Repository type must be either 'monorepo' or 'single'",
    })
    .default("single"),
});

/**
 * Schema for validating a single package.json configuration.
 * Combines package.json schema with default configuration schema.
 */
export const singleProjectPackageJsonSchema = z.object({
  ...packageJsonSchema.shape,
  ...singleProjectConfigSchema.shape,
});
