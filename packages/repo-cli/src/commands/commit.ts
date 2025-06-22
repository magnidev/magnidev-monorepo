import { Command } from "commander";
import prompts from "@clack/prompts";
import colors from "picocolors";

import RepositoryService from "@services/repositoryService";
import ReleaseService from "@services/releaseService";
import { intro, outro } from "@utils/intro";
import { onCommandFlowCancel, onCommandFlowError } from "@utils/events";

type CommitCommandOptions = {
  dryRun?: boolean;

  scope?: string;
  message?: string;
  body?: string;
};

function commitCommand(program: Command): Command {
  return program
    .command("commit")
    .description("commit changes to a Git repository")
    .option(
      "-d, --dry-run",
      "simulate the release process without making any changes",
      false
    )
    .option(
      "-s, --scope <scope>",
      "commit scope (e.g., feat, fix, chore, etc.)"
    )
    .option(
      "-m, --message <message>",
      "commit message (should be short and descriptive)"
    )
    .option("-b, --body <body>", "commit body (optional) (should be detailed)")
    .action(async (options: CommitCommandOptions) => {
      // #region - Initialization
      const { dryRun, scope, message, body } = options;

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
      // #endregion - Initialization

      try {
        // #region - Initialize Clients
        const repositoryService = new RepositoryService();
        const gitClient = repositoryService.gitClient;
        const releaseService = new ReleaseService(repositoryService);

        // Check if the current directory is a Git repository
        const isGitRepo = await repositoryService.checkIsGitRepo();
        if (!isGitRepo.success) {
          onCommandFlowCancel(isGitRepo.message);
        }

        // Check if there are any changes to commit
        const hasChanges = await gitClient.checkHasChanges();
        if (!hasChanges.success) {
          onCommandFlowCancel("No changes to commit.");
        }

        // Get uncommitted changes
        const changes = await gitClient.getChanges();
        if (!changes.success || !changes.data) {
          onCommandFlowCancel(changes.message);
        }

        // Check if the repository is a monorepo or single project
        const repoType = await repositoryService.getRepoType();
        if (!repoType.success || !repoType.data) {
          onCommandFlowCancel(repoType.message);
        }
        // #endregion - Initialize Clients

        const userConfig = await prompts.group(
          {
            // #region - @packageName
            packageName: async () => {
              if (repoType.data === "single") {
                const foundPackage =
                  await repositoryService.singleProvider.getPackage();
                if (!foundPackage.success || !foundPackage.data) {
                  onCommandFlowCancel(foundPackage.message);
                }

                return foundPackage.data!.name;
              }

              if (repoType.data === "monorepo") {
                const foundPackages =
                  await repositoryService.monorepoProvider.getPackages();
                if (!foundPackages.success || !foundPackages.data) {
                  onCommandFlowCancel(foundPackages.message);
                }

                const options = foundPackages.data!.map((pkg) => ({
                  label: pkg.name,
                  value: pkg.name,
                  hint: pkg.version,
                }));

                return await prompts.select({
                  message: "Select the package to commit changes to:",
                  options,
                  maxItems: 1,
                });
              }

              // If we reach here, it means an invalid type was selected
              onCommandFlowCancel("Invalid repository type.");
            },
            // #endregion - @packageName

            // #region - @commitType
            commitType: async () =>
              await prompts.select({
                message: "What type of commit is this?",
                initialValue: "feat",
                options: [
                  {
                    label: "Feature",
                    value: "feat",
                    hint: "A new feature",
                  },
                  {
                    label: "Fix",
                    value: "fix",
                    hint: "A bug fix",
                  },
                  {
                    label: "Chore",
                    value: "chore",
                    hint: "Other changes that don't modify src or test files",
                  },
                  {
                    label: "Docs",
                    value: "docs",
                    hint: "Documentation only changes",
                  },
                  {
                    label: "Style",
                    value: "style",
                    hint: "Changes that do not affect the meaning of the code",
                  },
                  {
                    label: "Refactor",
                    value: "refactor",
                    hint: "A code change that neither fixes a bug nor adds a feature",
                  },
                  {
                    label: "Perf",
                    value: "perf",
                    hint: "A code change that improves performance",
                  },
                  {
                    label: "Test",
                    value: "test",
                    hint: "Adding missing tests or correcting existing tests",
                  },
                  {
                    label: "Build",
                    value: "build",
                    hint: "Changes that affect the build system or external dependencies",
                  },
                  {
                    label: "CI",
                    value: "ci",
                    hint: "Changes to our CI configuration files and scripts",
                  },
                ],
                maxItems: 1,
              }),
            // #endregion - @commitType

            // #region - @commitScope
            commitScope: async ({ results }) => {
              if (repoType.data === "single") {
                return await prompts.text({
                  message: "Enter a commit scope (or leave empty):",
                  initialValue: scope,
                });
              }

              if (repoType.data === "monorepo") {
                return results.packageName;
              }

              // If we reach here, it means an invalid type was selected
              onCommandFlowCancel("Invalid repository type.");
            },
            // #endregion - @commitScope
            // #region - @commitMessage
            commitMessage: async () => {
              return await prompts.text({
                message: "Enter a commit message:",
                initialValue: message,
                validate: (value) => {
                  if (!value.trim()) {
                    return "Commit message cannot be empty.";
                  }
                  return undefined; // No error
                },
              });
            },
            // #endregion - @commitMessage

            // #region - @commitBody
            commitBody: async () => {
              return await prompts.text({
                message: "Enter a commit body (optional):",
                initialValue: body,
                validate: (value) => {
                  if (value.trim().length > 0 && !value.trim()) {
                    return "Commit body cannot be empty.";
                  }
                  return undefined; // No error
                },
              });
            },
            // #endregion - @commitBody

            // #region - @changes
            changes: async () => {
              const getLabel = (path: string, workingDir: string) => {
                const changeInfo = gitClient.getChangeInfo(workingDir);
                return `${path} ${changeInfo.consoleColor(`(${workingDir}) ${changeInfo.label}`)}`;
              };

              const getValue = (path: string, workingDir: string) => {
                return `${path}:${workingDir.toLocaleLowerCase()}`; // Use lowercase for consistency
              };

              const options =
                changes.data?.files.map((file) => ({
                  label: getLabel(file.path, file.working_dir),
                  value: getValue(file.path, file.working_dir),
                })) || [];

              return await prompts.multiselect({
                message: "Select the files to commit:",
                options,
                required: true,
              });
            },
            // #endregion - @changes

            // #region - @shouldPush
            shouldPush: async () =>
              await prompts.confirm({
                message: "Do you want to push the changes after committing?",
                initialValue: true,
              }),
          },
          {
            onCancel: () => onCommandFlowCancel("Commit cancelled."),
          }
        );

        // #region - Business Logic
        const tasks = await prompts.tasks([
          {
            title: "Constructing commit message",
            task: async () => {
              const {
                commitType,
                commitScope,
                commitMessage,
                commitBody,
                changes,
                shouldPush,
              } = userConfig;

              const commitResult = await releaseService.commitChanges(
                {
                  changes: changes as string[],
                  commitType: commitType as string,
                  commitMessage: commitMessage as string,
                  commitBody: commitBody as string,
                  commitScope: commitScope as string,
                },
                {
                  shouldPush,
                  dryRun,
                }
              );
              if (!commitResult.success || !commitResult.data) {
                onCommandFlowCancel(commitResult.message);
              }

              // Return a success message
              return `Committed ${commitResult.data?.changes.length} file(s) successfully.${userConfig.shouldPush ? " Changes pushed to remote." : colors.green(" Ready to push 🚀")}`;
            },
          },
        ]);

        if (prompts.isCancel(tasks)) {
          onCommandFlowCancel("Commit cancelled.");
        }

        prompts.outro(outro);

        // #endregion - Business Logic
      } catch (error: any) {
        onCommandFlowError(error);
      }
    });
}

export default commitCommand;
