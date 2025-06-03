import { Command } from "commander";

type ReleaseCommandOptions = {
  message?: string;
  tag?: string;
  name?: string;
  description?: string;
  prerelease?: boolean;
};

function releaseCommand(program: Command): Command {
  return program
    .command("release")
    .description("create a new GitHub Release")
    .option("-t, --tag <tag>", "release tag")
    .option("-n, --name <name>", "release name")
    .option("-d, --description <description>", "release description")
    .option("-p, --prerelease", "mark the release as a prerelease")
    .action(async (options: ReleaseCommandOptions) => {
      const { tag, name, description, prerelease } = options;
    });
}

export default releaseCommand;
