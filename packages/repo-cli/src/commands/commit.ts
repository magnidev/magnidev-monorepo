import { Command } from "commander";

type CommitCommandOptions = {
  message?: string;
};

function commitCommand(program: Command): Command {
  return program
    .command("commit")
    .description("commit changes to a Git repository")
    .option("-m, --message <message>", "commit message")
    .action(async (options: CommitCommandOptions) => {
      const { message } = options;
    });
}

export default commitCommand;
