import { Command } from "commander";
import prompts from "@clack/prompts";
import colors from "picocolors";

import RepositoryService from "@services/repositoryService";
import ReleaseService from "@services/releaseService";
import { dryRunMessage, introMessage, outroMessage } from "@utils/texts";
import { onCommandFlowCancel, onCommandFlowError } from "@utils/events";

type TagCommandOptions = {
  dryRun?: boolean;

  newVersion?: string;
};

function tagCommand(program: Command): Command {
  return program
    .command("tag")
    .description(
      "create a new git tag for a release (release is managed by `release` at CI/CD)"
    )
    .option(
      "-d, --dry-run",
      "simulate the creating tag process without making any changes",
      false
    )
    .option(
      "-v, --version <newVersion>",
      "specific version to tag (e.g., v1.0.0 or v1.0.0-beta)",
      (value: string) => value.trim() || undefined
    )
    .action(async (options: TagCommandOptions) => {
      // #region Initialization
      const { dryRun, newVersion } = options;

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

      if (dryRun) {
        prompts.log.info(dryRunMessage);
      }
      // #endregion Initialization

      try {
        // #region - Initialize Clients
        const repositoryService = new RepositoryService();
        const releaseService = new ReleaseService(repositoryService);

        // Check if the current directory is a Git repository
        const isGitRepo = await repositoryService.checkIsGitRepo();
        if (!isGitRepo.success) {
          onCommandFlowCancel(isGitRepo.message);
        }

        // Check if the repository is a monorepo or single project
        const repoType = await repositoryService.getRepoType();
        if (!repoType.success || !repoType.data) {
          onCommandFlowCancel(repoType.message);
        }
        // #endregion - Initialize Clients

        const userConfig = await prompts.group(
          {
            // #region - @pkgNameAndVersion
            pkgNameAndVersion: async () => {
              if (repoType.data === "single") {
                const singleProvider = repositoryService.singleProvider;
                const foundPackage = await singleProvider.getPackage();
                if (!foundPackage.success || !foundPackage.data) {
                  onCommandFlowCancel(foundPackage.message);
                }

                return `${foundPackage.data!.name}:${foundPackage.data!.version}`; // Format as "name:version"
              }

              if (repoType.data === "monorepo") {
                const monorepoProvider = repositoryService.monorepoProvider;
                const config = await monorepoProvider.getConfig();
                if (!config.success || !config.data) {
                  onCommandFlowCancel(config.message);
                }

                const versioningStrategy =
                  config.data!.release.versioningStrategy;

                if (versioningStrategy === "independent") {
                  const foundPackages = await monorepoProvider.getPackages();
                  if (!foundPackages.success || !foundPackages.data) {
                    onCommandFlowCancel(foundPackages.message);
                  }

                  const options = foundPackages.data!.map((pkg) => ({
                    label: pkg.name,
                    value: `${pkg.name}:${pkg.version}`, // Format as "name:version"
                    hint: pkg.version,
                  }));

                  return await prompts.select({
                    message: "Select the package to release:",
                    options,
                    maxItems: 1,
                  });
                } else if (versioningStrategy === "fixed") {
                  const foundPackageJson =
                    await monorepoProvider.getRootPackageJson();
                  if (!foundPackageJson.success || !foundPackageJson.data) {
                    onCommandFlowCancel(foundPackageJson.message);
                  }
                  const pkgName = foundPackageJson.data!.name;
                  const pkgVersion = foundPackageJson.data!.version;

                  return `${pkgName}:${pkgVersion}`; // Format as "name:version"
                }
              }

              // If we reach here, it means an invalid type was selected
              onCommandFlowCancel("Invalid repository type.");
            },
            // #endregion - @pkgNameAndVersion

            // #region - @newVersion
            newVersion: async ({ results }) => {
              if (newVersion) {
                // If the user provided a new version, use it directly
                return newVersion;
              }

              const [_name, version] =
                results.pkgNameAndVersion?.split(":") || [];

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
              const { pkgNameAndVersion, newVersion } = userConfig;

              const [pkgName] = pkgNameAndVersion.split(":");

              const tagResult = await releaseService.createTag(
                {
                  version: newVersion as string,
                  packageName: pkgName as string | undefined,
                },
                {
                  shouldPush: true, // TODO: Make this configurable
                  dryRun: dryRun,
                }
              );
              if (!tagResult.success || !tagResult.data) {
                throw new Error(tagResult.message);
              }

              return `Tag ${colors.green(tagResult.data.tagName)} created successfully for package ${colors.blue(pkgName)}.`;
            },
          },
        ]);

        if (prompts.isCancel(tasks)) {
          onCommandFlowCancel("Tag cancelled.");
        }

        prompts.outro(outroMessage);
        // #endregion - Business Logic
      } catch (error: any) {
        onCommandFlowError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
}

export default tagCommand;
