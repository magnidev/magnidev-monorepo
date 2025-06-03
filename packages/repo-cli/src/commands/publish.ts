import { Command } from "commander";

function publishCommand(program: Command): Command {
  return program
    .command("publish")
    .description("publish packages to a package registry")
    .action(async (options) => {});
}

export default publishCommand;
