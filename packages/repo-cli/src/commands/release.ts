import { Command } from "commander";
import prompts from "@clack/prompts";

import RepositoryService from "@services/repositoryService";
import ReleaseService from "@services/releaseService";
import { dryRunMessage, introMessage, outroMessage } from "@utils/texts";
import { onCommandFlowCancel, onCommandFlowError } from "@utils/events";

type ReleaseCommandOptions = {
  dryRun?: boolean;
  fromBranch?: string;
  tag?: string;
};

function releaseCommand(program: Command): Command {
  return program
    .command("release")
    .description("create a release from current branch (designed for CI/CD)")
    .option(
      "-d, --dry-run",
      "simulate the release process without making any changes",
      false
    )
    .option(
      "--from-branch <branch>",
      "create release from specific branch (auto-detects release branches)"
    )
    .option(
      "--tag <tag>",
      "specify a custom tag for the release (legacy option)"
    )
    .action(async (options: ReleaseCommandOptions) => {
      // #region Initialization
      const { dryRun, fromBranch, tag } = options;

      // In CI environment, minimize prompts
      const isCI =
        process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

      if (!isCI) {
        prompts.intro(introMessage);
        if (dryRun) {
          prompts.log.info(dryRunMessage);
        }
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

      // Get current branch to determine release context
      const currentBranch =
        await repositoryService.gitClient.getCurrentBranch();
      if (!currentBranch.success || !currentBranch.data) {
        onCommandFlowCancel("Could not determine current branch");
      }

      const branchName = fromBranch || currentBranch.data!;

      // Check if the repository is a monorepo or single project
      const repoType = await repositoryService.getRepoType();
      if (!repoType.success || !repoType.data) {
        onCommandFlowCancel(repoType.message);
      }
      // #endregion - Initialize Clients

      // #region - Business Logic
      try {
        // Detect if this is a release branch
        const isReleaseBranch = branchName.startsWith("release/");
        if (isReleaseBranch) {
          // Parse release branch name to extract package and version
          const releaseBranchMatch =
            branchName.match(/^release\/(.+)@(.+)$/) ||
            branchName.match(/^release\/v(.+)$/);

          if (!releaseBranchMatch) {
            onCommandFlowError(`Invalid release branch format: ${branchName}`);
          }

          const packageName = releaseBranchMatch![1]?.includes("@")
            ? releaseBranchMatch![1]
            : undefined;
          const version = releaseBranchMatch![2] || releaseBranchMatch![1];

          let tagName: string = "";
          let releaseNotes: string = "";

          const taskTitle = isCI
            ? "Processing release"
            : "Creating release from branch";

          const tasks = isCI
            ? null
            : await prompts.tasks([
                {
                  title: taskTitle,
                  task: async () => {
                    // Create tag
                    const tagResult = await releaseService.createTag(
                      { packageName, version },
                      { shouldPush: true, dryRun }
                    );

                    if (!tagResult.success || !tagResult.data) {
                      onCommandFlowError(tagResult.message);
                    }

                    tagName = tagResult.data!.tagName;

                    // Generate release notes
                    const notesResult =
                      await releaseService.generateReleaseNotes({
                        tagName,
                        packageName,
                      });

                    if (!notesResult.success || !notesResult.data) {
                      onCommandFlowError(notesResult.message);
                    }

                    releaseNotes = notesResult.data!;

                    return `Release created: ${tagName}`;
                  },
                },
              ]);

          // For CI, run without prompts
          if (isCI) {
            console.log(`🚀 Creating release from branch: ${branchName}`);

            // Create tag
            const tagResult = await releaseService.createTag(
              { packageName, version },
              { shouldPush: true, dryRun }
            );

            if (!tagResult.success || !tagResult.data) {
              onCommandFlowError(tagResult.message);
            }

            tagName = tagResult.data!.tagName;

            // Generate release notes
            const notesResult = await releaseService.generateReleaseNotes({
              tagName,
              packageName,
            });

            if (!notesResult.success || !notesResult.data) {
              onCommandFlowError(notesResult.message);
            }

            releaseNotes = notesResult.data!;

            console.log(`✅ Release created: ${tagName}`);
            console.log(`📝 Release notes:\n${releaseNotes}`);
          } else {
            if (prompts.isCancel(tasks)) {
              onCommandFlowCancel("Release cancelled.");
            }

            prompts.note(releaseNotes, "Release Notes:");
            prompts.log.success(`🎉 Release created: ${tagName}`);
          }
        } else if (tag) {
          // Legacy tag-based release
          let releaseNotes: string = "";

          const taskHandler = async () => {
            const releaseNotesResult =
              await releaseService.generateReleaseNotes({
                tagName: tag!,
              });

            if (!releaseNotesResult.success || !releaseNotesResult.data) {
              onCommandFlowError(releaseNotesResult.message);
            }

            releaseNotes = releaseNotesResult.data!;
            return `Release notes generated for tag: ${tag}`;
          };

          if (isCI) {
            console.log(`🚀 Generating release notes for tag: ${tag}`);
            await taskHandler();
            console.log(`📝 Release notes:\n${releaseNotes}`);
          } else {
            const tasks = await prompts.tasks([
              {
                title: "Generating release notes",
                task: taskHandler,
              },
            ]);

            if (prompts.isCancel(tasks)) {
              onCommandFlowCancel("Release cancelled.");
            }

            prompts.note(releaseNotes, "Release Notes:");
          }
        } else {
          onCommandFlowError(
            `Current branch '${branchName}' is not a release branch. Use 'prepare-release' to create a release branch first.`
          );
        }

        if (!isCI) {
          prompts.outro(outroMessage);
        }
      } catch (error: any) {
        onCommandFlowError(error);
      }
      // #endregion - Business Logic
    });
}

export default releaseCommand;
