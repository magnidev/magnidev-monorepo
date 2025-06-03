import { Command } from "commander";

type VersionCommandOptions = {
  tag?: string;
};

function versionCommand(program: Command): Command {
  return program
    .command("version")
    .description("bump the version")
    .option("-t, --tag <tag>", "version tag")
    .action(async (options: VersionCommandOptions) => {
      // #region Initialization
      const { tag } = options;
    });
}

export default versionCommand;
