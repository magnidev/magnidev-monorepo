import { Command } from "commander";
import prompts from "@clack/prompts";
import colors from "picocolors";

import type { VersionType } from "@/types/repository";
import RepositoryClient from "@lib/repositoryClient";
import GitHubClient from "@lib/githubClient";
import { VersionReleaseService } from "@services/versionReleaseService";
import { intro, outro } from "@utils/intro";
import { onCommandFlowCancel, onCommandFlowError } from "@utils/events";

type ReleaseCommandOptions = {
  tag?: string;
  type?: VersionType;
};

function releaseCommand(program: Command): Command {
  return program
    .command("release")
    .description("bump version, create release, and publish")
    .option("-t, --tag <tag>", "specific tag to use")
    .option(
      "--type <type>",
      "version bump type (patch, minor, major, prerelease)"
    )
    .action(async (options: ReleaseCommandOptions) => {
      // #region Initialization
      const { tag, type } = options;

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
      // #endregion Initialization

      try {
        // #region - Initialize Clients
        const repositoryClient = new RepositoryClient();
        const gitClient = repositoryClient.gitClient;
        const githubClient = new GitHubClient();
        const versionReleaseService = new VersionReleaseService(
          repositoryClient,
          githubClient
        );

        // Initialize GitHub client with token if available
        const githubToken = process.env.GITHUB_TOKEN;
        if (githubToken) {
          githubClient.init(githubToken);
        }

        // Check if the current directory is a Git repository
        const isGitRepo = await gitClient.checkIsRepo();
        if (!isGitRepo.success) {
          onCommandFlowCancel(isGitRepo.message);
        }

        // Check if the repository is a monorepo or single project
        const repoType = await repositoryClient.getRepoType();
        if (!repoType.success || !repoType.data) {
          onCommandFlowCancel(repoType.message);
        }

        // Get project configuration
        const configResult =
          repoType.data === "monorepo"
            ? await repositoryClient.monorepoProjectProvider.getConfig()
            : await repositoryClient.singleProjectProvider.getConfig();
        if (!configResult.success || !configResult.data) {
          onCommandFlowCancel(configResult.message);
        }
        // #endregion - Initialize Clients

        // #region - Command Flow
        const userConfig = await prompts.group(
          {
            // #region - @packageName
            packageName: async () => {
              if (repoType.data === "single") {
                const foundPackage =
                  await repositoryClient.singleProjectProvider.getPackage();
                if (!foundPackage.success || !foundPackage.data) {
                  onCommandFlowCancel(foundPackage.message);
                }

                return foundPackage.data!.name;
              }

              if (repoType.data === "monorepo") {
                const foundPackages =
                  await repositoryClient.monorepoProjectProvider.getPackages();
                if (!foundPackages.success || !foundPackages.data) {
                  onCommandFlowCancel(foundPackages.message);
                }

                const options = foundPackages.data!.map((pkg) => ({
                  label: pkg.name,
                  value: pkg.name,
                  hint: pkg.version,
                }));

                return await prompts.select({
                  message: "Select the package to version:",
                  options,
                  maxItems: 1,
                });
              }

              // If we reach here, it means an invalid type was selected
              onCommandFlowCancel("Invalid repository type.");
            },
            // #endregion - @packageName

            // #region - @versionType
            versionType: async () => {
              if (type) return type;

              return await prompts.select({
                message: "What type of version bump?",
                initialValue: "patch",
                options: [
                  {
                    label: "Patch",
                    value: "patch",
                    hint: "Bug fixes and small changes",
                  },
                  {
                    label: "Minor",
                    value: "minor",
                    hint: "New features, backwards compatible",
                  },
                  {
                    label: "Major",
                    value: "major",
                    hint: "Breaking changes",
                  },
                  {
                    label: "Prerelease",
                    value: "prerelease",
                    hint: "Pre-release version",
                  },
                ],
                maxItems: 1,
              });
            },
            // #endregion - @versionType

            // #region - @createGitHubRelease
            createGitHubRelease: async () => {
              if (!githubToken) {
                prompts.note(
                  "GitHub token not found. Skipping GitHub release option.",
                  "GitHub Release"
                );
                return false;
              }

              return await prompts.confirm({
                message: "Do you want to create a GitHub release?",
                initialValue: false,
              });
            },
            // #endregion - @createGitHubRelease

            // #region - @releaseName
            releaseName: async ({ results }) => {
              if (!results.createGitHubRelease) return undefined;

              return await prompts.text({
                message: "Enter the release name:",
                initialValue: "",
                validate: (value) => {
                  if (!value.trim()) {
                    return "Release name is required";
                  }
                  return undefined;
                },
              });
            },
            // #endregion - @releaseName

            // #region - @releaseDescription
            releaseDescription: async ({ results }) => {
              if (!results.createGitHubRelease) return undefined;

              return await prompts.text({
                message: "Enter the release description (optional):",
                initialValue: "",
              });
            },
            // #endregion - @releaseDescription

            // #region - @isPrerelease
            isPrerelease: async ({ results }) => {
              if (!results.createGitHubRelease) return false;

              return await prompts.confirm({
                message: "Is this a prerelease?",
                initialValue: results.versionType === "prerelease",
              });
            },
            // #endregion - @isPrerelease

            // #region - @publishToNpm
            publishToNpm: async () => {
              return await prompts.confirm({
                message: "Do you want to publish to npm?",
                initialValue: false,
              });
            },
            // #endregion - @publishToNpm
          },
          {
            onCancel: () => onCommandFlowCancel("Version command cancelled."),
          }
        );
        // #endregion - Command Flow

        // #region - Execute Version Release
        const result = await versionReleaseService.executeVersionRelease({
          packageName: userConfig.packageName as string,
          versionType: userConfig.versionType as VersionType,
          prereleaseId: configResult.data?.release.preReleaseIdentifier,
          customTag: tag,
          publishToNpm: userConfig.publishToNpm as boolean,
          createGitHubRelease: userConfig.createGitHubRelease as boolean,
          releaseName: userConfig.releaseName as string | undefined,
          releaseDescription: userConfig.releaseDescription as
            | string
            | undefined,
          isPrerelease: userConfig.isPrerelease as boolean,
        });

        if (!result.success || !result.data) {
          onCommandFlowCancel(result.message);
        }

        const { oldVersion, newVersion, tagName, releaseUrl, npmPublished } =
          result.data!;

        // Display results
        prompts.note(
          `${oldVersion} ---> ${newVersion}`,
          repoType.data === "single"
            ? "Version bumped successfully"
            : `Version bumped for ${userConfig.packageName}`
        );

        prompts.note(`Tag created: ${tagName}`, "Git Tag");

        if (userConfig.createGitHubRelease && releaseUrl) {
          prompts.note(`Release URL: ${releaseUrl}`, "GitHub Release Created");

          if (userConfig.isPrerelease) {
            prompts.note("This release is marked as prerelease", "Prerelease");
          }
        }

        if (userConfig.publishToNpm) {
          if (npmPublished) {
            prompts.note(
              repoType.data === "single"
                ? "Package published successfully to npm"
                : `Package ${userConfig.packageName} published successfully to npm`,
              "NPM Publish Complete"
            );
          } else {
            prompts.note("Failed to publish to npm", "NPM Publish Failed");
          }
        }
        // #endregion - Execute Version Release
        prompts.outro(outro);
      } catch (error: any) {
        onCommandFlowError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
}

export default releaseCommand;
