import prompts from "@clack/prompts";
import { Command } from "commander";

import type { RepoInfo } from "@/types/services/repositoryService";
import type { MonorepoPackageJson } from "@/types/providers/monorepoProvider";
import RepositoryService from "@services/repositoryService";
import { introMessage, outroMessage } from "@utils/texts";
import { formatSections } from "@utils/formatter";
import { onCommandFlowCancel, onCommandFlowError } from "@utils/events";

type InfoCommandOptions = {
  package?: string;
  repository?: boolean;
  all?: boolean;
};

function infoCommand(program: Command): Command {
  return program
    .command("info")
    .description("display information about the repository or packages")
    .option(
      "-p, --package <name>",
      "display information for a specific package",
      (name: string) => name.trim() || undefined
    )
    .option(
      "-r, --repository",
      "display only repository information (ignores packages)",
      false
    )
    .option(
      "-a, --all",
      "display all available information (includes repository and all packages if applicable)",
      true
    )
    .action(async (options: InfoCommandOptions) => {
      // #region - Initialization
      const {
        package: showOnlyPackageByName,
        repository: showRepositoryOnly,
        all: showAll,
      } = options;

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
      // #endregion - Initialization

      try {
        // #region - Initialize Clients
        const repositoryService = new RepositoryService();

        // Check if we're in a git repository
        const isGitRepo = await repositoryService.checkIsGitRepo();
        if (!isGitRepo.success) {
          onCommandFlowCancel(isGitRepo.message);
        }

        // Get repository type
        const repoType = await repositoryService.getRepoType();
        if (!repoType.success || !repoType.data) {
          onCommandFlowCancel(repoType.message);
        }

        // Gather repository information
        const repoInfo = await repositoryService.getRepoInfo();
        if (!repoInfo.success || !repoInfo.data) {
          onCommandFlowCancel(repoInfo.message);
        }
        // #endregion - Initialize Clients

        if (showOnlyPackageByName) {
          await displayPackageInfo({
            packageName: showOnlyPackageByName,
            repoInfo: repoInfo.data!,
            repositoryService,
          });
          return;
        }

        if (showRepositoryOnly) {
          await displayRepoInfo(repoInfo.data!);
          return;
        }

        if (showAll) {
          await displayAllInfo({ repoInfo: repoInfo.data!, repositoryService });
          return;
        }

        prompts.outro(outroMessage);
      } catch (error: any) {
        onCommandFlowError(error);
      }
    });
}

// #region - @displayPackageInfo
async function displayPackageInfo({
  packageName,
  repoInfo,
  repositoryService,
}: {
  packageName: string;
  repoInfo: RepoInfo;
  repositoryService: RepositoryService;
}): Promise<void> {
  if (repoInfo.repoType === "single") {
    onCommandFlowCancel(
      "Displaying package information is not supported for single projects."
    );
  }

  const getPackageAuthor = (author: MonorepoPackageJson["author"]): string => {
    if (!author) return "Unknown";
    if (typeof author === "string") return author;
    return `${author.name || "Unknown"}${
      author.email ? ` <${author.email}>` : ""
    }`;
  };

  if (repoInfo.repoType === "monorepo") {
    const packageInfo =
      await repositoryService.monorepoProvider.getPackageByName(packageName);

    if (!packageInfo.success || !packageInfo.data) {
      onCommandFlowCancel(packageInfo.message);
    }

    prompts.note(
      formatSections({
        sections: [
          {
            title: "General Information",
            items: [
              { label: "Package Name", value: packageInfo.data!.name },
              {
                label: "Package Version",
                value: packageInfo.data!.version,
              },
              {
                label: "Package License",
                value: packageInfo.data!.license || "Unknown",
              },
              {
                label: "Package Description",
                value: packageInfo.data!.description,
              },
              {
                label: "Package Author",
                value: getPackageAuthor(packageInfo.data!.author),
              },
            ],
          },
          {
            title: "Dependencies Summary",
            items: [
              {
                label: "Dependencies",
                items: Object.entries(packageInfo.data!.dependencies || {}).map(
                  ([dep, version]) => ({
                    label: dep,
                    value: version,
                  })
                ),
              },
              {
                label: "Dev Dependencies",
                items: Object.entries(
                  packageInfo.data!.devDependencies || {}
                ).map(([dep, version]) => ({
                  label: dep,
                  value: version,
                })),
              },
            ],
          },
        ],
      }),
      `Package information for ${packageInfo.data!.name}.`
    );
    return;
  }
}
// #endregion - @displayPackageInfo

// #region - @displayAllInfo
async function displayAllInfo({
  repoInfo,
  repositoryService,
}: {
  repoInfo: RepoInfo;
  repositoryService: RepositoryService;
}): Promise<void> {
  prompts.log.info(
    "Displaying all available information, including repository and packages."
  );

  await displayRepoInfo(repoInfo);

  if (repoInfo.repoType === "monorepo") {
    prompts.log.info("Displaying all packages in the monorepo project.");

    const packagesInfo = await repositoryService.monorepoProvider.getPackages();

    if (!packagesInfo.success || !packagesInfo.data) {
      onCommandFlowCancel(packagesInfo.message);
    }

    for (const packageInfo of packagesInfo.data!) {
      await displayPackageInfo({
        packageName: packageInfo.name,
        repoInfo,
        repositoryService,
      });
    }
  }
}
// #endregion - @displayAllInfo

// #region - @displayRepoInfo
async function displayRepoInfo({
  repoType,
  currentBranch,
  remoteUrl,
  owner,
  repo,
  changes,
}: RepoInfo): Promise<void> {
  prompts.note(
    formatSections({
      sections: [
        {
          title: "General Information",
          items: [
            {
              label: "Repository Type",
              value: repoType,
            },
            { label: "Repository Name", value: repo },
            { label: "Remote URL", value: remoteUrl },
            { label: "Owner", value: owner },
          ],
        },
        {
          title: "Git",
          items: [
            {
              label: "Current Branch",
              value: currentBranch,
            },
            {
              label: "Change Status",
              items: changes
                ? [
                    { label: "Ahead", value: String(changes.ahead) },
                    { label: "Behind", value: String(changes.behind) },
                  ]
                : [],
            },
            {
              label: "Uncommitted Changes",
              items: changes
                ? [
                    ...changes.files.map((file) => ({
                      label: "File",
                      value: file,
                    })),
                  ]
                : [],
            },
          ],
        },
      ],
    }),
    "Repository Information"
  );
}
// #endregion - @displayRepoInfo

export default infoCommand;
