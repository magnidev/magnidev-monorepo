import { z } from "zod/v4";

/**
 * Schema for validating package.json files in a Node.js project.
 */
export const packageJsonSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),

  description: z.string().optional(),
  license: z.string().min(1).optional(),
  keywords: z.array(z.string().min(1)).optional(),
  author: z
    .object({
      name: z.string().min(1).optional(),
      email: z.email().optional(),
      url: z.url().optional(),
    })
    .optional(),
  repository: z
    .object({
      type: z.enum(["git"]),
      url: z.url(),
      directory: z.string().min(1).optional(),
    })
    .optional(),
  bugs: z
    .object({
      url: z.url().optional(),
      email: z.email().optional(),
    })
    .optional(),
  homepage: z.url().optional(),

  files: z.array(z.string().min(1)).optional(),
  dependencies: z.record(z.string().min(1), z.string().min(1)).optional(),
  devDependencies: z.record(z.string().min(1), z.string().min(1)).optional(),
  peerDependencies: z.record(z.string().min(1), z.string().min(1)).optional(),
  scripts: z.record(z.string().min(1), z.string().min(1)).optional(),

  release: z
    .object({
      tagFormat: z.string().optional(),
      repositoryUrl: z.url().optional(),
    })
    .optional(),

  publishConfig: z
    .object({
      access: z.enum(["public", "restricted"]),
      registry: z.url().optional(),
    })
    .optional(),
});
