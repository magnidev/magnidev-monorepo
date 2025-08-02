import { Command } from "commander";
import prompts from "@clack/prompts";

import RepositoryService from "@services/repositoryService";
import ReleaseService from "@services/releaseService";
import { dryRunMessage, introMessage, outroMessage } from "@utils/texts";
import { onCommandFlowCancel, onCommandFlowError } from "@utils/events";

type PrepareReleaseCommandOptions = {
  dryRun?: boolean;

  package?: string;
  version?: string;
};

function prepareReleaseCommand(program: Command): Command {
  return program
    .command("prepare-release")
    .description("create a release branch for CI/CD automation")
    .option(
      "-d, --dry-run",
      "simulate the release preparation without making any changes",
      false
    )
    .option("-v, --version <version>", "version to release (e.g., 1.2.3)")
    .action(async (options: PrepareReleaseCommandOptions) => {
      // #region Initialization
      const { dryRun, package: packageName, version: newVersion } = options;

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

      // #region - Business Logic
      try {
        const userConfig = await prompts.group({
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
        });

        let branchName: string = "";
        let releaseNotes: string = "";

        const tasks = await prompts.tasks([
          {
            title: "Creating release branch",
            task: async () => {
              const { pkgNameAndVersion, newVersion } = userConfig;

              const [pkgName, version] = pkgNameAndVersion.split(":");

              // Use the BranchReleaseStrategy through the ReleaseService
              const result = await releaseService.createReleaseBranch(
                {
                  packageName: pkgName as string,
                  version: newVersion as string,
                },
                {
                  shouldPush: true,
                  dryRun,
                }
              );

              if (!result.success || !result.data) {
                onCommandFlowError(result.message);
              }

              branchName = result.data!.branchName;
              releaseNotes = result.data!.releaseNotes;

              return `Release branch '${branchName}' created successfully`;
            },
          },
        ]);

        if (prompts.isCancel(tasks)) {
          onCommandFlowCancel("Release preparation cancelled.");
        }

        prompts.note(releaseNotes, "Release Notes Preview:");

        prompts.log.success(`🎉 Release branch created: ${branchName}`);
        prompts.log.info(
          "The CI will automatically create the release when this branch is detected."
        );

        if (!dryRun) {
          prompts.note(
            `1. Review the release branch: git checkout ${branchName}\n2. Create a PR for review (optional)\n3. CI will automatically tag and release`,
            "Next Steps:"
          );
        }

        prompts.outro(outroMessage);
      } catch (error: any) {
        onCommandFlowError(error);
      }
      // #endregion - Business Logic
    });
}

export default prepareReleaseCommand;
