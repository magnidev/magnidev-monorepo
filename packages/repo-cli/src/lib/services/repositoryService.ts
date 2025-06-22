/**
 * @name RepositoryService
 * @file src/lib/services/repositoryService.ts
 * @description Class to manage repository information and configuration
 */

import path from "node:path";

import type { FunctionResultPromise } from "@/types";
import type {
  RepoInfo,
  RepoTypeResult,
} from "@/types/services/repositoryService";
import monorepoProvider from "@providers/monorepoProvider";
import singleProvider from "@providers/singleProvider";
import GitClient from "@lib/gitClient";
import { dirExists, readJsonFile } from "@utils/files";

class Repository {
  public gitClient: GitClient;

  public monorepoProvider: monorepoProvider;
  public singleProvider: singleProvider;

  constructor() {
    this.gitClient = new GitClient();

    this.monorepoProvider = new monorepoProvider();
    this.singleProvider = new singleProvider();
  }

  // #region - @getRepoType
  /**
   * @description Get the type of repository (single or monorepo) based on the presence of a workspaces field in package.json.
   * @returns {FunctionResultPromise<RepoTypeResult>} The type of repository or null if not determined.
   */
  public async getRepoType(): FunctionResultPromise<RepoTypeResult> {
    let success: boolean = false;
    let message: string = "";
    let data: RepoTypeResult = null;

    try {
      // Load the root package.json file
      const rootPackageJsonPath = path.join(process.cwd(), "package.json");
      if (!dirExists(rootPackageJsonPath)) {
        throw new Error("No package.json found in the current directory");
      }

      // Read and parse the root package.json file
      const rootPackageJson = await readJsonFile(rootPackageJsonPath);
      if (!rootPackageJson || typeof rootPackageJson !== "object") {
        throw new Error("Invalid package.json format");
      }

      const isMonorepo = rootPackageJson.repoType === "monorepo";
      const isSingle = rootPackageJson.repoType === "single";

      if (isMonorepo) {
        message = "Monorepo detected";
        data = "monorepo";
      } else if (isSingle) {
        message = "Single repository detected";
        data = "single";
      }

      success = true;
    } catch (error: any) {
      success = false;
      message = "Failed to determine repository type";

      if (error instanceof Error) {
        message = error.message;
      }
    }

    return {
      success,
      message,
      data,
    };
  }
  // #endregion - @getRepoType

  // #region - @checkIsGitRepo
  /**
   * @description Checks if the current directory is a git repository.
   * @returns {FunctionResultPromise} A promise that resolves to an object indicating success or failure.
   */
  public async checkIsGitRepo(): FunctionResultPromise {
    let success: boolean = false;
    let message: string = "";

    try {
      const isRepo = await this.gitClient.checkIsRepo();
      if (!isRepo) {
        throw new Error("Current directory is not a git repository");
      }

      success = true;
      message = "Current directory is a git repository";
    } catch (error: any) {
      success = false;
      message = "Failed to check if current directory is a git repository";

      if (error instanceof Error) {
        message = error.message;
      }
    }

    return {
      success,
      message,
    };
  }
  // #endregion - @checkIsGitRepo

  // #region - @getRepoInfo
  /**
   * @description Retrieves information about the current repository, including the current branch, remote URL, owner, and repository name.
   * @returns {FunctionResultPromise<{ currentBranch: string; remoteUrl: string; owner: string; repo: string } | null>}
   */
  public async getRepoInfo(): FunctionResultPromise<RepoInfo | null> {
    let success: boolean = false;
    let message: string = "";
    let data: RepoInfo | null = null;

    try {
      // Determine the repository type
      const repoTypeResult = await this.getRepoType();
      if (!repoTypeResult.success || !repoTypeResult.data) {
        throw new Error(repoTypeResult.message);
      }

      const [currentBranch, remoteUrl, ownerAndRepo, changes] =
        await Promise.all([
          this.gitClient.getCurrentBranch(),
          this.gitClient.getRemoteUrl(),
          this.gitClient.getOwnerAndRepo(),
          this.gitClient.getChanges(),
        ]);

      if (
        !currentBranch.success ||
        !currentBranch.data ||
        !remoteUrl.success ||
        !remoteUrl.data ||
        !ownerAndRepo.success ||
        !ownerAndRepo.data ||
        !changes.success ||
        !changes.data
      ) {
        throw new Error("Failed to retrieve repository information");
      }

      const getChangesValue = (path: string, working_dir: string) => {
        const changeInfo = this.gitClient.getChangeInfo(working_dir);
        return `${path} ${changeInfo.consoleColor(`(${working_dir}) ${changeInfo.label}`)}`;
      };

      success = true;
      message = "Repository information retrieved successfully";
      data = {
        repoType: repoTypeResult.data,
        currentBranch: currentBranch.data,
        remoteUrl: remoteUrl.data,
        owner: ownerAndRepo.data.owner,
        repo: ownerAndRepo.data.repo,
        changes: {
          behind: changes.data.behind,
          ahead: changes.data.ahead,
          files: changes.data.files.map((file) =>
            getChangesValue(file.path, file.working_dir)
          ),
        },
      };
    } catch (error: any) {
      success = false;
      message = "Failed to retrieve repository information";

      if (error instanceof Error) {
        message = error.message;
      }
    }

    return {
      success,
      message,
      data,
    };
  }
  // #endregion - @getRepoInfo
}

export default Repository;
