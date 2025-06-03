import * as prompts from "@clack/prompts";
import { Command } from "commander";
import colors from "picocolors";
import z from "zod/v4";

import type { MonorepoProjectConfig, SingleProjectConfig } from "@/types";
import { intro } from "@/assets/intro";
import MonorepoProjectProvider, {
  defaultMonorepoProjectConfig,
} from "@/lib/providers/monorepoProjectProvider";
import SingleProjectProvider, {
  defaultSingleProjectConfig,
} from "@/lib/providers/singleProjectProvider";

type InitCommandOptions = {
  monorepo?: boolean;
  single?: boolean;
  yes?: boolean;
};

function initCommand(program: Command): Command {
  return program
    .command("init")
    .description("initialize the required configuration")
    .option("--monorepo", "initialize a monorepo configuration")
    .option("--single", "initialize a single project configuration")
    .option("-y, --yes", "skip prompts and use default values")
    .action(async (options: InitCommandOptions) => {
      // #region Initialization
      const { monorepo, single, yes: shouldSkip } = options;

      prompts.updateSettings({
        aliases: {
          w: "up",
          s: "down",
          a: "left",
          d: "right",
          esc: "cancel",
        },
      });

      prompts.intro(colors.white(intro));

      // Validate that only one of --monorepo or --single is used
      if (monorepo && single) {
        onCancel("Cannot use both --monorepo and --single options together.");
      }

      const userConfig = await prompts.group(
        {
          // #region Repo Type
          type: async () => {
            // Determine the type of repository based on user input or options
            if (monorepo) return "monorepo";
            if (single) return "single";
            if (shouldSkip) return "single"; // Default to single if --yes is used

            return await prompts.select({
              message: "What kind of repository is this?",
              options: [
                {
                  value: "monorepo",
                  label: "Monorepo",
                  hint: "A repository containing multiple packages/projects.",
                },
                {
                  value: "single",
                  label: "Single Repository",
                  hint: "A single package/project repository.",
                },
              ],
            });
          },
          // #endregion
          // #region Release Config
          release: async ({ results }) => {
            // If --yes is true, use default values
            if (shouldSkip) {
              if (results.type === "monorepo")
                return defaultMonorepoProjectConfig.release;
              if (results.type === "single")
                return defaultSingleProjectConfig.release;

              // If we reach here, it means an invalid type was selected
              return onCancel("Invalid repository type selected.");
            }

            // #region Monorepo Project
            if (results.type === "monorepo") {
              const versioningStrategy = (await prompts.select({
                message: "Select a release versioningStrategy:",
                options: [
                  {
                    value: "fixed",
                    label: "Fixed",
                    hint: "All packages are released together.",
                  },
                  {
                    value: "independent",
                    label: "Independent",
                    hint: "Each package is released independently.",
                  },
                ],
                initialValue: "independent",
                maxItems: 1,
              })) as MonorepoProjectConfig["release"]["versioningStrategy"];

              if (prompts.isCancel(versioningStrategy)) onCancel();

              return {
                tagFormat: defaultMonorepoProjectConfig.release.tagFormat,
                versioningStrategy: versioningStrategy,
              } satisfies MonorepoProjectConfig["release"];
            }
            // #endregion

            // #region  Single Project
            if (results.type === "single") {
              return {
                tagFormat: defaultSingleProjectConfig.release.tagFormat,
              } satisfies SingleProjectConfig["release"];
            }
            // #endregion

            // If we reach here, it means an invalid type was selected
            return onCancel("Invalid repository type selected.");
          },
          // #endregion
          // #region Workspaces Config
          workspaces: async ({ results }) => {
            if (results.type === "monorepo") {
              // If --yes is true, use default workspaces
              if (shouldSkip) return defaultMonorepoProjectConfig.workspaces;

              const validateWorkspace = (value: string) => {
                if (value.trim() === "") {
                  return undefined; // Allow empty input to finish
                }
                if (z.string().min(1).safeParse(value).success) {
                  return undefined; // No error means valid workspace
                }
                return "Workspace name must be at least 1 character long.";
              };

              const workspaces = (await prompts.text({
                message:
                  "Enter a workspace pattern (space-separated if multiple):",
                placeholder: "e.g., packages/*",
                initialValue: "packages/*",
                validate: validateWorkspace,
              })) as string;

              const parsedWorkspaces = workspaces.split(" ").filter(Boolean);

              return Array.from(parsedWorkspaces);
            }

            return undefined; // No workspaces for single projects
          },
          // #endregion
          // #region Publish Config
          publishConfig: async ({ results }) => {
            if (results.type === "single") {
              // If --yes is true, use default publishConfig
              if (shouldSkip) return defaultSingleProjectConfig.publishConfig;

              const validateRegistry = (value: string) => {
                if (z.url().safeParse(value).success) {
                  return undefined; // No error means valid URL
                }
                return "Invalid registry URL format.";
              };

              // single project specific configuration
              const access = (await prompts.select({
                message: "Select the access level for publishing:",
                options: [
                  {
                    value: "public",
                    label: "Public",
                    hint: "Package will be publicly accessible.",
                  },
                  {
                    value: "restricted",
                    label: "Restricted",
                    hint: "Package will be restricted to specific users or teams.",
                  },
                ],
                initialValue: "public",
                maxItems: 1,
              })) as SingleProjectConfig["publishConfig"]["access"];

              if (prompts.isCancel(access)) onCancel();

              const registry = (await prompts.text({
                message: "Enter the npm registry URL:",
                placeholder: "e.g., https://registry.npmjs.org/",
                initialValue: "https://registry.npmjs.org/",
                validate: validateRegistry,
              })) as SingleProjectConfig["publishConfig"]["registry"];

              if (prompts.isCancel(registry)) onCancel();
            }

            return undefined; // No publishConfig for monorepo projects
          },
        },
        {
          onCancel: () => onCancel("Initialization cancelled."),
        }
      );
      // #endregion

      // #region Business Logic
      const tasks = await prompts.tasks([
        {
          title: "Initializing Monorepo configuration...",
          task: async () => {
            const client = new MonorepoProjectProvider();

            const { success, message } = await client.init(
              userConfig as MonorepoProjectConfig
            );
            if (!success) onCancel(message);
            return message;
          },
          enabled: userConfig.type === "monorepo",
        },
        {
          title: "Initializing Single Project configuration...",
          task: async () => {
            const client = new SingleProjectProvider();

            const { success, message } = await client.init(
              userConfig as SingleProjectConfig
            );
            if (!success) onCancel(message);
            return message;
          },
          enabled: userConfig.type === "single",
        },
      ]);

      if (prompts.isCancel(tasks)) {
        onCancel("Initialization cancelled.");
      }

      prompts.outro("🚀 Repo CLI by @magnidev, happy coding!");

      // #endregion
    });
}

function onCancel(message?: string) {
  prompts.cancel(message || "Operation cancelled.");
  process.exit(1); // Exit the process with an error code
}

export default initCommand;
