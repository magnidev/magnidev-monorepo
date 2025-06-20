import prompts from "@clack/prompts";
import { Command } from "commander";
import colors from "picocolors";

import type { RepoInfo } from "@/types/repository";
import type { MonorepoProjectPackageJson } from "@/types/providers/monorepoProject";
import RepositoryClient from "@lib/repositoryClient";
import GitClient from "@lib/gitClient";
import { intro } from "@utils/intro";
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

      prompts.intro(colors.white(intro));
      // #endregion - Initialization

      try {
        // #region - Initialize Clients
        const gitClient = new GitClient();
        const repositoryClient = new RepositoryClient();

        // Check if we're in a git repository
        const isGitRepo = await gitClient.checkIsRepo();
        if (!isGitRepo.success) {
          onCommandFlowCancel(isGitRepo.message);
        }

        // Get repository type
        const repoType = await repositoryClient.getRepoType();
        if (!repoType.success || !repoType.data) {
          onCommandFlowCancel(repoType.message);
        }

        // Gather repository information
        const repoInfo = await repositoryClient.getRepoInfo();
        if (!repoInfo.success || !repoInfo.data) {
          onCommandFlowCancel(repoInfo.message);
        }
        // #endregion - Initialize Clients

        if (showOnlyPackageByName) {
          await displayPackageInfo({
            packageName: showOnlyPackageByName,
            repoInfo: repoInfo.data!,
            repositoryClient,
          });
          return;
        }

        if (showRepositoryOnly) {
          await displayRepoInfo(repoInfo.data!);
          return;
        }

        if (showAll) {
          await displayAllInfo({ repoInfo: repoInfo.data!, repositoryClient });
          return;
        }

        prompts.outro("🚀 Repo CLI by @magnidev, happy coding!");
      } catch (error: any) {
        onCommandFlowError(error as Error);
      }
    });
}

// #region - @displayPackageInfo
async function displayPackageInfo({
  packageName,
  repoInfo,
  repositoryClient,
}: {
  packageName: string;
  repoInfo: RepoInfo;
  repositoryClient: RepositoryClient;
}): Promise<void> {
  if (repoInfo.repoType === "single") {
    onCommandFlowCancel(
      "Displaying package information is not supported for single projects."
    );
  }

  const getPackageAuthor = (
    author: MonorepoProjectPackageJson["author"]
  ): string => {
    if (!author) return "Unknown";
    if (typeof author === "string") return author;
    return `${author.name || "Unknown"}${
      author.email ? ` <${author.email}>` : ""
    }`;
  };

  if (repoInfo.repoType === "monorepo") {
    const packageInfo =
      await repositoryClient.monorepoProjectProvider.getPackageByName(
        packageName
      );

    if (!packageInfo.success || !packageInfo.data) {
      onCommandFlowCancel(packageInfo.message);
    }

    prompts.note(
      displayInfo([
        {
          title: "General Information",
          fields: [
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
          fields: [
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
      ]),
      `Package information for ${packageInfo.data!.name}.`
    );
    return;
  }
}
// #endregion - @displayPackageInfo

// #region - @displayAllInfo
async function displayAllInfo({
  repoInfo,
  repositoryClient,
}: {
  repoInfo: RepoInfo;
  repositoryClient: RepositoryClient;
}): Promise<void> {
  prompts.log.info(
    "Displaying all available information, including repository and packages."
  );

  await displayRepoInfo(repoInfo);

  if (repoInfo.repoType === "monorepo") {
    prompts.log.info("Displaying all packages in the monorepo project.");

    const packagesInfo =
      await repositoryClient.monorepoProjectProvider.getPackages();

    if (!packagesInfo.success || !packagesInfo.data) {
      onCommandFlowCancel(packagesInfo.message);
    }

    for (const packageInfo of packagesInfo.data!) {
      await displayPackageInfo({
        packageName: packageInfo.name,
        repoInfo,
        repositoryClient,
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
    displayInfo([
      {
        title: "General Information",
        fields: [
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
        fields: [
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
    ]),
    "Repository Information"
  );
}
// #endregion - @displayRepoInfo

// #region - @displayInfo
/**
 * @description Formats and displays an array of label-value pairs as a string. Each field is displayed on a new line with the label in green.
 * @param sections - An array of sections, each containing a title and fields.
 * @returns {string} - A formatted string representing the sections and their fields.
 */
function displayInfo(
  sections: {
    title: string;
    fields: {
      label: string;
      value?: string;
      items?: {
        label: string;
        value: string;
      }[];
    }[];
  }[]
): string {
  if (sections.length === 0) {
    onCommandFlowCancel("No information available to display.");
  }

  const formattedSections = sections.map(({ title, fields }, idx) => {
    const formattedFields = fields.map(({ label, value, items }) => {
      const formattedLabel = colors.green(label + ":");
      if (items && items.length > 0) {
        const formattedItems = items
          .map((item) => `  - ${colors.green(item.label + ":")} ${item.value}`)
          .join("\n");
        return `- ${formattedLabel}\n${formattedItems}`;
      }
      return `- ${formattedLabel} ${value}`;
    });
    return `${idx != 0 ? "\n" : ""}* ${colors.bold(title)} *\n${formattedFields.join("\n")}`;
  });
  return formattedSections.join("\n");
}
// #endregion - @displayInfo

export default infoCommand;
