/**
 * @name GitClient
 * @file src/lib/gitClient.ts
 * @description Class to manage git operations and repository information
 */

import simpleGit, { type SimpleGit } from "simple-git";

class GitClient {
  public client: SimpleGit;

  constructor() {
    this.client = simpleGit(process.cwd());
  }
}

export default GitClient;
