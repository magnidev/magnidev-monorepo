import { Command } from "commander";
import prompts from "@clack/prompts";

import { introMessage, outroMessage } from "@utils/texts";
import { onCommandFlowError } from "@utils/events";

type ReleaseCommandOptions = {
  dryRun?: boolean;
  ci?: boolean;
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
      "--ci",
      "run the release process in CI mode (creates a release without prompts)"
    )
    .action(async (options: ReleaseCommandOptions) => {
      // #region Initialization
      const { dryRun, ci } = options;

      prompts.intro(introMessage);
      // #endregion Initialization

      try {
        prompts.outro(outroMessage);
      } catch (error: any) {
        onCommandFlowError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
}

export default releaseCommand;
