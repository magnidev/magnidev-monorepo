import { Command } from "commander";
import prompts from "@clack/prompts";
import z from "zod/v4";

import type { MonorepoConfig } from "@/types/providers/monorepoProvider";
import type { SingleConfig } from "@/types/providers/singleProvider";
import RepositoryService from "@services/repositoryService";
import { introMessage, outroMessage } from "@utils/texts";
import { onCommandFlowCancel, onCommandFlowError } from "@utils/events";
import {
  generateSingleWorkflow,
  generateMonorepoWorkflow,
  generateWorkflowSetupInstructions,
} from "@utils/workflowGenerator";

type InitCommandOptions = {
  monorepo?: boolean;
  single?: boolean;
};

function initCommand(program: Command): Command {
  return program
    .command("init")
    .description("initialize the required configuration")
    .option("--monorepo", "initialize a monorepo configuration")
    .option("--single", "initialize a single project configuration")
    .action(async (options: InitCommandOptions) => {
      // #region - Initialization
      const { monorepo: useMonorepo, single: useSingle } = options;

      prompts.updateSettings({
        aliases: {
          w: "up",
          s: "down",
          a: "left",
          d: "right",
          esc: "cancel",
        },
      });

      prompts.intro(introMessage);

      // Validate that only one of --monorepo or --single is used
      if (useMonorepo && useSingle) {
        onCommandFlowCancel(
          "Cannot use both --monorepo and --single options together."
        );
      }
      // #endregion - Initialization

      try {
        const repositoryService = new RepositoryService();

        // #region - Command Flow
        const userConfig = await prompts.group(
          {
            // #region - @repoType
            repoType: async () => {
              // Determine the type of repository based on user input or options
              if (useMonorepo) return "monorepo";
              if (useSingle) return "single";

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
            // #endregion - @repoType

            // #region - @release
            release: async ({ results }) => {
              // If --monorepo or --single is used, return the default release config
              if (useMonorepo) {
                const { release } = repositoryService.monorepoProvider.config;

                return release;
              }
              if (useSingle) {
                const { release } = repositoryService.singleProvider.config;

                return release;
              }

              // general release configuration
              const preReleaseIdentifier = (await prompts.text({
                message: "Enter the pre-release identifier:",
                placeholder: "e.g., canary, beta, alpha",
                initialValue: "canary",
              })) as MonorepoConfig["release"]["preReleaseIdentifier"];

              if (prompts.isCancel(preReleaseIdentifier)) {
                onCommandFlowCancel();
              }

              if (results.repoType === "monorepo") {
                const validateTagFormat = (value: string) => {
                  if (
                    z
                      .string()
                      .regex(/^.*\$\{version\}.*$/, {
                        error:
                          "Tag format must include ${version} placeholder.",
                      })
                      .safeParse(value).success
                  ) {
                    return undefined; // No error means valid tag format
                  }
                  return "Tag format must include ${version} placeholder.";
                };

                const tagFormat = (await prompts.text({
                  message: "Enter the tag format for releases:",
                  placeholder: "e.g., v${version}",
                  initialValue: "v${version}",
                  validate: validateTagFormat,
                })) as MonorepoConfig["release"]["tagFormat"];

                if (prompts.isCancel(tagFormat)) onCommandFlowCancel();

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
                })) as MonorepoConfig["release"]["versioningStrategy"];

                if (prompts.isCancel(versioningStrategy)) onCommandFlowCancel();

                return {
                  tagFormat,
                  versioningStrategy,
                  preReleaseIdentifier,
                } satisfies MonorepoConfig["release"];
              }
              if (results.repoType === "single") {
                return {
                  tagFormat: "v${version}",
                  preReleaseIdentifier,
                } satisfies SingleConfig["release"];
              }

              // If we reach here, it means an invalid type was selected
              onCommandFlowCancel("Invalid repository type.");
            },
            // #endregion - @release

            // #region - @workspaces
            workspaces: async ({ results }) => {
              // If --monorepo or --single is used, return the default workspaces config
              if (useMonorepo) {
                const { workspaces } =
                  repositoryService.monorepoProvider.config;

                return workspaces;
              }

              if (useSingle) return undefined; // Single project does not have workspaces

              if (results.repoType === "monorepo") {
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

                if (prompts.isCancel(workspaces)) onCommandFlowCancel();

                const parsedWorkspaces = workspaces.split(" ").filter(Boolean);

                return Array.from(parsedWorkspaces);
              }

              // If we reach here, it means an invalid type was selected
              return undefined; // Return undefined for not-handled cases
            },
            // #endregion - @workspaces

            // #region - @publishConfig
            publishConfig: async ({ results }) => {
              // If --monorepo or --single is used, return the default publishConfig
              if (useMonorepo) return undefined; // Monorepo does not have a default publishConfig

              if (useSingle) {
                const { publishConfig } =
                  repositoryService.singleProvider.config;

                return publishConfig;
              }

              if (results.repoType === "single") {
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
                })) as SingleConfig["publishConfig"]["access"];

                if (prompts.isCancel(access)) onCommandFlowCancel();

                const registry = (await prompts.text({
                  message: "Enter the npm registry URL:",
                  placeholder: "e.g., https://registry.npmjs.org/",
                  initialValue: "https://registry.npmjs.org/",
                  validate: validateRegistry,
                })) as SingleConfig["publishConfig"]["registry"];

                if (prompts.isCancel(registry)) onCommandFlowCancel();
              }
              return undefined; // Return undefined for not-handled cases
            },
            // #endregion - @publishConfig

            // #region - @createGitHubWorkflow
            createGitHubWorkflow: async () => {
              return await prompts.confirm({
                message:
                  "Do you want to create GitHub workflows for automated releases?",
                initialValue: true,
              });
            },
            // #endregion - @createGitHubWorkflow
          },
          {
            onCancel: () => onCommandFlowCancel("Initialization cancelled."),
          }
        ); // #endregion - Command Flow

        // #region - Business Logic
        const tasks = await prompts.tasks([
          {
            title: "Initializing Monorepo configuration...",
            task: async () => {
              const client = repositoryService.monorepoProvider;

              const { success, message } = await client.init(
                userConfig as MonorepoConfig
              );
              if (!success) onCommandFlowCancel(message);
              return message;
            },
            enabled: userConfig.repoType === "monorepo",
          },
          {
            title: "Initializing Single Project configuration...",
            task: async () => {
              const client = repositoryService.singleProvider;

              const { success, message } = await client.init(
                userConfig as SingleConfig
              );
              if (!success) onCommandFlowCancel(message);
              return message;
            },
            enabled: userConfig.repoType === "single",
          },
          {
            title: "Creating GitHub workflow for monorepo...",
            task: async () => {
              const { success, message } = await generateMonorepoWorkflow();
              if (!success) onCommandFlowCancel(message);
              return message;
            },
            enabled:
              userConfig.createGitHubWorkflow === true &&
              userConfig.repoType === "monorepo",
          },
          {
            title: "Creating GitHub workflow for single project...",
            task: async () => {
              const { success, message } = await generateSingleWorkflow();
              if (!success) onCommandFlowCancel(message);
              return message;
            },
            enabled:
              userConfig.createGitHubWorkflow === true &&
              userConfig.repoType === "single",
          },
          {
            title: "Creating workflow setup instructions...",
            task: async () => {
              const { success, message } =
                await generateWorkflowSetupInstructions();
              if (!success) onCommandFlowCancel(message);
              return message;
            },
            enabled: userConfig.createGitHubWorkflow === true,
          },
        ]);
        if (prompts.isCancel(tasks)) {
          onCommandFlowCancel("Initialization cancelled.");
        }

        // Show additional info if workflows were created
        if (userConfig.createGitHubWorkflow) {
          prompts.note(
            "GitHub workflows have been created! Check GITHUB_WORKFLOW_SETUP.md for setup instructions.",
            "Next Steps"
          );
          prompts.note(
            "Don't forget to:\n• Add NPM_TOKEN to your GitHub repository secrets\n• Enable workflow permissions in repository settings",
            "Important"
          );
        }

        prompts.outro(outroMessage);

        // #endregion Business Logic
      } catch (error: any) {
        onCommandFlowError(error);
      }
    });
}

export default initCommand;
