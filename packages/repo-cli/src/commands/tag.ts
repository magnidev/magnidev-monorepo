import { Command } from "commander";
import prompts from "@clack/prompts";
import colors from "picocolors";

import type { VersionType } from "@/types/repository";
import RepositoryClient from "@lib/repositoryClient";
import ReleaseService from "@services/releaseService";
import { intro, outro } from "@utils/intro";
import { onCommandFlowCancel, onCommandFlowError } from "@utils/events";

type TagCommandOptions = {
  dryRun?: boolean;
  tag?: string;
  type?: VersionType;
};

function tagCommand(program: Command): Command {
  return program
    .command("tag")
    .description(
      "create a new git tag for a release (release is managed by `release` at CI/CD)"
    )
    .option(
      "-d, --dry-run",
      "simulate the release process without making any changes",
      false
    )
    .option(
      "-t, --tag <tag>",
      "specific tag to use (e.g., v1.0.0 or v1.0.0-beta)"
    )
    .option(
      "--type <type>",
      "version bump type (patch, minor, major, prerelease)"
    )
    .action(async (options: TagCommandOptions) => {
      // #region Initialization
      const { dryRun, tag, type } = options;

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

      if (dryRun) {
        prompts.log.info(`Dry run mode ${colors.blue("enabled")}.`);
      }
      // #endregion Initialization

      try {
        // #region - Initialize Clients
        const repositoryClient = new RepositoryClient();
        const gitClient = repositoryClient.gitClient;
        const releaseService = new ReleaseService(repositoryClient);

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
        // #endregion - Initialize Clients

        const userConfig = await prompts.group(
          {
            // #region - @packageNameAndVersion
            packageNameAndVersion: async () => {
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
                  value: `${pkg.name} ${pkg.version}`,
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
            // #endregion - @packageNameAndVersion

            // #region - @newVersion
            newVersion: async ({ results }) => {
              const [_name, version] =
                results.packageNameAndVersion?.split(" ") || [];

              const suggestedVersions =
                await releaseService.suggestVersions(version);
              if (!suggestedVersions.success || !suggestedVersions.data) {
                onCommandFlowCancel(suggestedVersions.message);
              }

              const options = [
                {
                  label: "Patch",
                  value: suggestedVersions.data?.patch!,
                  hint: `from ${version} to ${suggestedVersions.data?.patch!}`,
                },
                {
                  label: "Minor",
                  value: suggestedVersions.data?.minor!,
                  hint: `from ${version} to ${suggestedVersions.data?.minor!}`,
                },
                {
                  label: "Major",
                  value: suggestedVersions.data?.major!,
                  hint: `from ${version} to ${suggestedVersions.data?.major!}`,
                },
                {
                  label: "Pre-release",
                  value: suggestedVersions.data?.prerelease!,
                  hint: `from ${version} to ${suggestedVersions.data?.prerelease!}`,
                },
              ];

              return await prompts.select({
                message: "Select the version bump type:",
                options,
                maxItems: 1,
              });
            },
            // #endregion - @newVersion
          },
          {
            onCancel: () => onCommandFlowCancel("Tag command cancelled."),
          }
        );

        // #region - Business Logic
        const tasks = await prompts.tasks([
          {
            title: "Creating tag",
            task: async () => {
              const { packageNameAndVersion, newVersion } = userConfig;

              const [pkgName, _currentVersion] =
                packageNameAndVersion?.split(" ") || [];

              const tagResult = await releaseService.createTag(
                {
                  packageName: pkgName as string,
                  version: newVersion as string,
                },
                {
                  shouldPush: true, // TODO: Make this configurable
                  dryRun: dryRun,
                }
              );
              if (!tagResult.success || !tagResult.data) {
                throw new Error(tagResult.message);
              }

              return `Tag ${colors.green(tagResult.data)} created successfully for package ${colors.blue(pkgName)}.`;
            },
          },
        ]);

        if (prompts.isCancel(tasks)) {
          onCommandFlowCancel("Tag cancelled.");
        }

        prompts.outro(outro);
        // #endregion - Business Logic
      } catch (error: any) {
        onCommandFlowError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
}

export default tagCommand;
