import { Command } from "commander";
import prompts from "@clack/prompts";

import RepositoryService from "@services/repositoryService";
import ReleaseService from "@services/releaseService";
import { dryRunMessage, introMessage, outroMessage } from "@utils/texts";
import { onCommandFlowCancel, onCommandFlowError } from "@utils/events";

type ReleaseCommandOptions = {
  dryRun?: boolean;

  tag?: string;
};

function releaseCommand(program: Command): Command {
  return program
    .command("release")
    .description("create a new release for the repository")
    .option(
      "-d, --dry-run",
      "simulate the release process without making any changes",
      false
    )
    .option(
      "--tag <tag>",
      "specify a custom tag for the release",
      (value: string) => {
        if (!value) {
          onCommandFlowError("Tag value cannot be empty.");
        }
        return value.trim();
      }
    )
    .action(async (options: ReleaseCommandOptions) => {
      // #region Initialization
      const { dryRun, tag } = options;

      // ensure the tag option is provided
      if (!tag) {
        onCommandFlowError("Tag option is required for the release command.");
      }

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

      try {
        let releaseNotes: string = "";

        const tasks = await prompts.tasks([
          {
            title: "Creating release notes",
            task: async () => {
              // Create the release
              const releaseNotesResult =
                await releaseService.generateReleaseNotes({
                  tagName: tag!,
                });

              if (!releaseNotesResult.success || !releaseNotesResult.data) {
                onCommandFlowError(releaseNotesResult.message);
              }

              releaseNotes = releaseNotesResult.data!;

              return `Release notes generated successfully for tag: ${tag}`;
            },
          },
        ]);

        if (prompts.isCancel(tasks)) {
          onCommandFlowCancel("Commit cancelled.");
        }

        prompts.note(releaseNotes, "Release Notes:");

        prompts.outro(outroMessage);
      } catch (error: any) {
        onCommandFlowError(error);
      }
    });
}

export default releaseCommand;
