import { Command } from "commander";
import prompts from "@clack/prompts";
import colors from "picocolors";

import type { VersionType } from "@/types/repository";
import RepositoryClient from "@lib/repositoryClient";
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
    .description("bump version and create git tags (CI/CD handles publishing)")
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
        const versionReleaseService = new VersionReleaseService(
          repositoryClient
        );

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
            ? await repositoryClient.monorepoProvider.getConfig()
            : await repositoryClient.singleProvider.getConfig();
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
                  await repositoryClient.singleProvider.getPackage();
                if (!foundPackage.success || !foundPackage.data) {
                  onCommandFlowCancel(foundPackage.message);
                }

                return foundPackage.data!.name;
              }

              if (repoType.data === "monorepo") {
                const foundPackages =
                  await repositoryClient.monorepoProvider.getPackages();
                if (!foundPackages.success || !foundPackages.data) {
                  onCommandFlowCancel(foundPackages.message);
                }

                const options = foundPackages.data!.map((pkg) => ({
                  label: pkg.name,
                  value: pkg.name,
                  hint: pkg.version,
                }));

                return await prompts.select({
                  message: "Select the package to release:",
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
          },
          {
            onCancel: () => onCommandFlowCancel("Release command cancelled."),
          }
        );
        // #endregion - Command Flow

        // #region - Execute Version Release
        const result = await versionReleaseService.executeVersionRelease({
          packageName: userConfig.packageName as string,
          versionType: userConfig.versionType as VersionType,
          prereleaseId: configResult.data?.release.preReleaseIdentifier,
          customTag: tag,
        });
        if (!result.success || !result.data) {
          onCommandFlowCancel(result.message);
        }

        const { oldVersion, newVersion, tagName } = result.data!;

        // Display results
        prompts.note(
          `${oldVersion} ---> ${newVersion}`,
          repoType.data === "single"
            ? "Version bumped successfully"
            : `Version bumped for ${userConfig.packageName}`
        );

        prompts.note(`Tag created and pushed: ${tagName}`, "Git Tag");

        prompts.note(
          "Your tag has been pushed! The CI/CD pipeline will handle creating the GitHub release and publishing to npm.",
          "Release Pipeline"
        );
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
