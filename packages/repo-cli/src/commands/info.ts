import { Command } from "commander";

function infoCommand(program: Command): Command {
  return program
    .command("info")
    .description("display information about the repository or packages")
    .action(async (options) => {});
}

export default infoCommand;
