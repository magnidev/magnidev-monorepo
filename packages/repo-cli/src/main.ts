#!/usr/bin/env node

import { Command } from "commander";

import { intro } from "@utils/intro";
import initCommand from "@commands/init";
import infoCommand from "@commands/info";
import commitCommand from "@commands/commit";
import releaseCommand from "@commands/release";
import tagCommand from "@commands/tag";

// Display the intro message
const program = new Command();

program
  .version("1.0.3")
  .name("Repo CLI by @magnidev")
  .description(
    intro +
      "\n\n\nThis CLI tool helps you manage your repositories and monorepos on GitHub, providing commands for information retrieval, committing changes, versioning, releasing, and publishing packages."
  );

// Register commands
initCommand(program);
infoCommand(program);
commitCommand(program);
releaseCommand(program);
tagCommand(program);

// Handle unknown commands
program.parse(process.argv);
