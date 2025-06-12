import prompts from "@clack/prompts";
import { Command } from "commander";
import colors from "picocolors";

import RepositoryClient from "@lib/repositoryClient";
import { intro } from "@/utils/intro";
import { onCommandFlowCancel, onCommandFlowError } from "@/utils/events";

type VersionCommandOptions = {};

function versionCommand(program: Command): Command {
  return program
    .command("version")
    .description("bump the version")
    .action(async (options: VersionCommandOptions) => {
      // #region Initialization
      const {} = options;

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

        // Check if the repository is a monorepo or single project
        const repoType = await repositoryClient.getRepoType();
        if (!repoType.success || !repoType.data) {
          onCommandFlowCancel(repoType.message);
        }
        // #endregion - Initialize Clients

        // #region - Command Flow
        const userConfig = await prompts.group({
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
                message: "Select the package to bump the version:",
                options,
                maxItems: 1,
              });
            }

            // If we reach here, it means an invalid type was selected
            onCommandFlowCancel("Invalid repository type.");
          },
          // #endregion - @packageName

          // #region - @version
          version: async ({ results }) => {
            let packageInfo: any | null = null;

            const packageName = results.packageName as string;

            if (repoType.data === "single") {
              packageInfo =
                await repositoryClient.singleProjectProvider.getPackage();
            }

            if (repoType.data === "monorepo") {
              packageInfo =
                await repositoryClient.monorepoProjectProvider.getPackageByName(
                  packageName
                );
            }

            if (!packageInfo.success || !packageInfo.data) {
              onCommandFlowCancel(packageInfo.message);
            }

            const versions = repositoryClient.suggestNextVersions(
              packageInfo.data!.version
            );

            if (versions.length === 0) {
              onCommandFlowCancel("No valid versions found.");
            }

            return await prompts.select({
              message: `Select the version to bump for package ${packageName}:`,
              options: versions.map((version) => ({
                label: version,
                value: version,
              })),
              maxItems: 1,
            });
          },
          // #endregion - @version
        });
        // #endregion - Command Flow
      } catch (error: any) {
        onCommandFlowError(error as Error);
      }
    });
}

export default versionCommand;
