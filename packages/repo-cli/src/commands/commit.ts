import { Command } from "commander";
import prompts from "@clack/prompts";
import colors from "picocolors";

import RepositoryClient from "@lib/repositoryClient";
import { intro, outro } from "@utils/intro";
import { onCommandFlowCancel, onCommandFlowError } from "@utils/events";

type CommitCommandOptions = {
  scope?: string;
  message?: string;
  body?: string;
};

function commitCommand(program: Command): Command {
  return program
    .command("commit")
    .description("commit changes to a Git repository")
    .option("-s, --scope <scope>", "commit scope")
    .option("-m, --message <message>", "commit message")
    .option("-b, --body <body>", "commit body")
    .action(async (options: CommitCommandOptions) => {
      // #region - Initialization
      const { scope, message, body } = options;

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
        const repositoryClient = new RepositoryClient();
        const gitClient = repositoryClient.gitClient;

        // Check if the current directory is a Git repository
        const isGitRepo = await gitClient.checkIsRepo();
        if (!isGitRepo.success) {
          onCommandFlowCancel(isGitRepo.message);
        }

        // Check if there are any changes to commit
        const hasChanges = await gitClient.checkHasChanges();
        if (!hasChanges.success || !hasChanges.data) {
          onCommandFlowCancel("No changes to commit.");
        }

        // Get uncommitted changes
        const changes = await gitClient.getChanges();
        if (!changes.success || !changes.data) {
          onCommandFlowCancel(changes.message);
        }

        // Check if the repository is a monorepo or single project
        const repoType = await repositoryClient.getRepoType();
        if (!repoType.success || !repoType.data) {
          onCommandFlowCancel(repoType.message);
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
        // #endregion - Command Flow

        // #region - Business Logic
        const tasks = await prompts.tasks([
          {
            title: "Constructing commit message",
            task: async () => {
              const {
                packageName,
                commitType,
                commitScope,
                commitMessage,
                commitBody,
                changes,
              } = userConfig;

              // Prepare the files to commit
              const filesToCommit = changes.map((change: string) => {
                const [path, workingDir] = change.split(":");
                return { path, workingDir };
              });

              // Add changes to the git staging area
              const addResult = await gitClient.addFiles(
                filesToCommit.map((file) => file.path)
              );
              if (!addResult.success) {
                throw new Error(addResult.message);
              }

              // Perform the commit
              const commitResult = await gitClient.commitChanges({
                type: commitType,
                message: commitMessage,
                body: commitBody,
                scope: commitScope as string,
              });
              if (!commitResult.success) {
                throw new Error(commitResult.message);
              }

              // If the user opted to push, do it now
              if (userConfig.shouldPush) {
                const pushResult = await gitClient.pushChanges(); // Push changes to the remote repository
                if (!pushResult.success) {
                  throw new Error(pushResult.message);
                }
              }

              // Return a success message
              return `Committed ${filesToCommit.length} file(s) successfully.${userConfig.shouldPush ? " Changes pushed to remote." : colors.green(" Ready to push 🚀")}`;
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
