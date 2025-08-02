/**
 * @name monorepoProvider
 * @file src/lib/providers/monorepoProvider.ts
 * @description Class to manage monorepo project information and configuration
 */

import path from "node:path";
import fg from "fast-glob";

import type { FunctionResultPromise } from "@/types";
import type {
  MonorepoConfig,
  MonorepoPackageJson,
  MonorepoRootPackageJson,
} from "@/types/providers/monorepoProvider";
import type { Commit } from "@/types/gitClient";
import GitClient from "@lib/gitClient";
import {
  monorepoConfigSchema,
  monorepoPackageJsonSchema,
  monorepoRootPackageJsonSchema,
} from "@schemas/providers/monorepoSchemas";
import { dirExists, readJsonFile, writeJsonFile } from "@utils/files";
import { ignorePaths } from "@utils/ignorePaths";

class MonorepoProvider {
  private gitClient: GitClient;

  public config: MonorepoConfig = {
    release: {
      tagFormat: "${name}@${version}",
      versioningStrategy: "independent",
      preReleaseIdentifier: "canary", // Default identifier for pre-release versions
    },
    workspaces: ["packages/*"],
    repoType: "monorepo",
  };

  constructor(gitClient: GitClient) {
    this.gitClient = gitClient;
  }

  // #region - @parseConfig
  /**
   * @description Parses and validates the provided configuration object for a monorepo project.
   * @param config The configuration object to parse.
   * @returns {FunctionResultPromise<MonorepoConfig | null>} A promise that resolves to a FunctionResult containing the parsed configuration or an error message.
   */
  private async parseConfig(
    config: MonorepoConfig | null
  ): FunctionResultPromise<MonorepoConfig | null> {
    let success: boolean = false;
    let message: string = "";
    let data: MonorepoConfig | null = null;

    try {
      if (!config) {
        throw new Error("No configuration provided.");
      }

      const parsedConfig = await monorepoConfigSchema.safeParseAsync(config);

      if (!parsedConfig.success) {
        throw new Error(
          `Configuration validation failed: ${parsedConfig.error.message}`
        );
      }

      success = true;
      message = "Configuration parsed successfully.";
      data = parsedConfig.data;
    } catch (error) {
      success = false;
      message = `Failed to parse configuration: ${error instanceof Error ? error.message : String(error)}`;
    }

    return {
      success,
      message,
      data,
    };
  }
  // #endregion - @parseConfig

  // #region - @parsePackageJson
  /**
   * @param packageJson The package.json object to parse.
   * @description Parses and validates the provided package.json object for a monorepo project.
   * @returns {FunctionResultPromise<MonorepoPackageJson | null>} A promise that resolves to a FunctionResult containing the parsed package.json or an error message.
   */
  public async parsePackageJson(
    packageJson: MonorepoPackageJson | null
  ): FunctionResultPromise<MonorepoPackageJson | null> {
    let success: boolean = false;
    let message: string = "";
    let data: MonorepoPackageJson | null = null;

    try {
      if (!packageJson) {
        throw new Error("No package.json provided.");
      }

      const parsedPackageJson =
        await monorepoPackageJsonSchema.safeParseAsync(packageJson);

      if (!parsedPackageJson.success) {
        throw new Error(
          `Package.json validation failed: ${parsedPackageJson.error.message}`
        );
      }

      success = true;
      message = "Package information loaded successfully.";
      data = parsedPackageJson.data;
    } catch (error) {
      success = false;
      message = `Failed to load package information: ${error instanceof Error ? error.message : String(error)}`;
    }

    return { success, message, data };
  }
  // #endregion - @parsePackageJson

  // #region - @getConfig
  /**
   * @description Loads the configuration for a monorepo project repository.
   * @returns {FunctionResultPromise<MonorepoConfig | null>} A promise that resolves to a FunctionResult containing the monorepo project configuration or an error message.
   */
  public async getConfig(): FunctionResultPromise<MonorepoConfig | null> {
    let success: boolean = false;
    let message: string = "";
    let data: MonorepoConfig | null = null;

    try {
      // Load the root package.json file
      const rootPackageJsonPath = path.join(process.cwd(), "package.json");
      if (!dirExists(rootPackageJsonPath)) {
        throw new Error("No package.json found in the current directory");
      }

      // Read and parse the root package.json file
      const rootPackageJsonParsed = await this.parseConfig(
        await readJsonFile(rootPackageJsonPath) // Read and parse the root package.json file
      );
      if (!rootPackageJsonParsed.success || !rootPackageJsonParsed.data) {
        throw new Error(rootPackageJsonParsed.message);
      }

      this.config = rootPackageJsonParsed.data; // Update the provider's config with the loaded configuration

      success = true;
      message = "Configuration loaded successfully.";
      data = rootPackageJsonParsed.data;
    } catch (error) {
      success = false;
      message = `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`;
    }

    return {
      success,
      message,
      data,
    };
  }
  // #endregion - @getConfig

  // #region - @init
  /**
   * @description Initializes the monorepo project configuration by merging user-provided settings with the default configuration.
   * @param userConfig The user-provided configuration for the monorepo project.
   * @returns {FunctionResultPromise<MonorepoConfig | null>} A promise that resolves to a FunctionResult containing the initialized configuration or an error message.
   */
  public async init(
    userConfig: MonorepoConfig
  ): FunctionResultPromise<MonorepoConfig | null> {
    let success: boolean = false;
    let message: string = "";
    let data: MonorepoConfig | null = null;

    try {
      // Find if a configuration already exists
      const foundConfig = await this.getConfig();
      if (foundConfig.success) {
        throw new Error("Configuration already exists.");
      }

      // Parse and validate the user-provided configuration
      const userConfigParsed = await this.parseConfig(userConfig);
      if (!userConfigParsed.success || !userConfigParsed.data) {
        throw new Error(userConfigParsed.message);
      }

      // Write the validated configuration to the root package.json file
      const rootPackageJsonPath = path.join(process.cwd(), "package.json");
      if (!dirExists(rootPackageJsonPath)) {
        throw new Error("No package.json found in the current directory");
      }

      // Read the existing package.json to preserve other fields
      const existingPackageJson = await readJsonFile(rootPackageJsonPath);

      // Merge the existing package.json with the new configuration
      const newPackageJson = {
        ...existingPackageJson,
        ...userConfigParsed.data,
      };

      // Write the merged configuration back to the package.json file
      await writeJsonFile(rootPackageJsonPath, newPackageJson);

      success = true;
      message = "Monorepo configuration initialized successfully.";
      data = userConfigParsed.data; // Use the validated configuration data
    } catch (error) {
      success = false;
      message = `Failed to initialize monorepo repository configuration: ${error instanceof Error ? error.message : String(error)}`;
    }

    return { success, message, data };
  }
  // #endregion - @init

  // #region - @getPackages
  /**
   * @description Retrieves all packages in the monorepo workspaces defined in the root package.json.
   * @returns {FunctionResultPromise<MonorepoPackageJson[] | null>} A promise that resolves to a FunctionResult containing an array of package.json objects or an error message.
   */
  public async getPackages(): FunctionResultPromise<
    MonorepoPackageJson[] | null
  > {
    let success: boolean = false;
    let message: string = "";
    let data: MonorepoPackageJson[] | null = null;

    try {
      // Load the root package.json file
      const rootPackageJsonPath = path.join(process.cwd(), "package.json");
      if (!dirExists(rootPackageJsonPath)) {
        throw new Error("No package.json found in the current directory");
      }

      // Read the root package.json file
      const rootPackageJsonContent = await readJsonFile(rootPackageJsonPath);
      if (!rootPackageJsonContent) {
        throw new Error("Failed to read package.json root file.");
      }

      // Parse and validate the package.json content
      const configParsed = await this.parseConfig(rootPackageJsonContent);
      if (!configParsed.success || !configParsed.data) {
        throw new Error(configParsed.message);
      }

      // Read and parse each package.json in the workspaces
      const packages: MonorepoPackageJson[] = [];
      /**
       * example of workpaces [ "packages/*", "libs/*", "apps/*" ]
       */
      for (const workspace of configParsed.data.workspaces) {
        const packagePaths = await fg(workspace, {
          cwd: process.cwd(),
          ignore: ignorePaths,
          onlyFiles: false,
          absolute: true,
        });

        for (const packagePath of packagePaths) {
          const packageJsonPath = path.join(packagePath, "package.json");
          if (dirExists(packageJsonPath)) {
            const packageJsonContent = await readJsonFile(packageJsonPath);
            if (packageJsonContent) {
              const packageParsed =
                await this.parsePackageJson(packageJsonContent);
              if (packageParsed.success && packageParsed.data) {
                packages.push(packageParsed.data);
              }
            }
          }
        }
      }

      if (packages.length === 0) {
        throw new Error("No packages found in the monorepo workspaces.");
      }

      success = true;
      message = "Packages loaded successfully.";
      data = packages;
    } catch (error) {
      success = false;
      message = `Failed to load packages: ${error instanceof Error ? error.message : String(error)}`;
    }

    return { success, message, data };
  }
  // #endregion - @getPackages

  // #region - @getPackageByName
  /**
   * @description Retrieves a specific package by its name from the monorepo workspaces.
   * @param packageName The name of the package to retrieve.
   * @returns {FunctionResultPromise<MonorepoPackageJson | null>} A promise that resolves to a FunctionResult containing the package.json object or an error message.
   */
  public async getPackageByName(
    packageName: string
  ): FunctionResultPromise<MonorepoPackageJson | null> {
    let success: boolean = false;
    let message: string = "";
    let data: MonorepoPackageJson | null = null;

    try {
      // Load the packages
      const packagesResult = await this.getPackages();
      if (!packagesResult.success || !packagesResult.data) {
        throw new Error(packagesResult.message);
      }

      // Find the package by name
      const packageFound = packagesResult.data.find(
        (pkg) => pkg.name === packageName
      );
      if (!packageFound) {
        throw new Error(`Package "${packageName}" not found.`);
      }

      success = true;
      message = "Package loaded successfully.";
      data = packageFound;
    } catch (error) {
      success = false;
      message = `Failed to load package: ${error instanceof Error ? error.message : String(error)}`;
    }

    return { success, message, data };
  }
  // #endregion - @getPackageByName

  // #region - @getRootPackageJson
  /**
   * @description Retrieves the root package.json file of the monorepo.
   * @returns {FunctionResultPromise<MonorepoRootPackageJson | null>} A promise that resolves to a FunctionResult containing the root package.json object or an error message.
   */
  public async getRootPackageJson(): FunctionResultPromise<MonorepoRootPackageJson | null> {
    let success: boolean = false;
    let message: string = "";
    let data: MonorepoRootPackageJson | null = null;

    try {
      // Load the root package.json file
      const rootPackageJsonPath = path.join(process.cwd(), "package.json");
      if (!dirExists(rootPackageJsonPath)) {
        throw new Error("No package.json found in the current directory");
      }

      // Read the root package.json file
      const rootPackageJsonContent = await readJsonFile(rootPackageJsonPath);
      if (!rootPackageJsonContent) {
        throw new Error("Failed to read package.json root file.");
      }

      // Parse and validate the package.json content
      const configParsed = await monorepoRootPackageJsonSchema.safeParseAsync(
        rootPackageJsonContent
      );
      if (!configParsed.success || !configParsed.data) {
        throw new Error(
          `Package.json validation failed: ${configParsed.error.message}`
        );
      }

      success = true;
      message = "Root package.json loaded successfully.";
      data = configParsed.data;
    } catch (error) {
      success = false;
      message = `Failed to load root package.json: ${error instanceof Error ? error.message : String(error)}`;
    }

    return { success, message, data };
  }
  // #endregion - @getRootPackageJson

  // #region - @getTagsForPackage
  /**
   * @description Retrieves all tags associated with a specific package in the monorepo.
   * @param packageName The name of the package to retrieve tags for.
   * @returns {FunctionResultPromise<string[] | null>} A promise that resolves to a FunctionResult containing an array of tag names or an error message.
   */
  public async getTagsForPackage(
    packageName: string
  ): FunctionResultPromise<string[] | null> {
    let success: boolean = false;
    let message: string = "";
    let data: string[] | null = null;

    try {
      // Get the tags for the package
      const tagsResult = await this.gitClient.getTags();
      if (!tagsResult.success || !tagsResult.data) {
        throw new Error(tagsResult.message);
      }

      // Filter the tags to only include those for the specified package
      data = tagsResult.data.all.filter((tag) => tag.includes(packageName));
      success = true;
      message = "Tags retrieved successfully.";
    } catch (error) {
      success = false;
      message = `Failed to retrieve tags for package '${packageName}': ${error instanceof Error ? error.message : String(error)}`;
    }

    return { success, message, data };
  }

  // #region - @getTagsForPackage

  // #region - @filterCommitsForPackage
  /**
   * @description Filters commits to only include those relevant to the specific package.
   * Uses file-based analysis, conventional commit scopes, and package name mentions.
   * @param data Object containing the package name and an array of commits to filter.
   * @returns Filtered commits relevant to the package.
   */
  public async filterCommitsForPackage(data: {
    pkgName: string;
    commits: Commit[];
  }): FunctionResultPromise<Commit[] | null> {
    let success: boolean = false;
    let message: string = "";
    let dataResult: Commit[] | null = null;

    const { pkgName, commits } = data;

    try {
      // Get the package directory path relative to repo root
      const packagePath = await this.getPackagePath(pkgName);
      if (!packagePath.success || !packagePath.data) {
        throw new Error(`Could not determine path for package: ${pkgName}`);
      }

      const filteredCommits = await Promise.all(
        commits.map(async (commit) => {
          const commitMessage = commit.message;
          let shouldInclude = false;
          let reason = "";

          // Strategy 1: File-based analysis (primary method)
          const filesChanged = await this.gitClient.getCommitFiles(commit.hash);
          if (filesChanged.success && filesChanged.data) {
            const affectsPackage = filesChanged.data.some((filePath) =>
              filePath.startsWith(packagePath.data!)
            );
            if (affectsPackage) {
              shouldInclude = true;
              reason = "file-based";
            }
          }

          // Strategy 2: Conventional commit scope analysis (fallback)
          if (!shouldInclude) {
            const conventionalMatch = commitMessage.match(
              /^(feat|fix|docs|style|refactor|perf|test|chore|build|ci)(\(([^)]+)\))?:/
            );

            if (conventionalMatch && conventionalMatch[3]) {
              const scope = conventionalMatch[3];
              if (
                scope === pkgName ||
                scope.includes(pkgName) ||
                scope === packagePath.data?.split("/").pop() // package folder name
              ) {
                shouldInclude = true;
                reason = "scope-based";
              }
            }
          }

          // Strategy 3: Package name mention in commit message (fallback)
          if (!shouldInclude) {
            if (commitMessage.includes(pkgName)) {
              shouldInclude = true;
              reason = "name-mention";
            }
          }

          return shouldInclude ? { ...commit, filterReason: reason } : null;
        })
      );

      const validCommits = filteredCommits.filter(Boolean) as (Commit & {
        filterReason: string;
      })[];

      success = true;
      message = `Filtered ${validCommits.length} commits for package '${pkgName}'`;
      dataResult = validCommits;
    } catch (error: any) {
      success = false;
      message = "Failed to filter commits for package.";

      if (error instanceof Error) {
        message = error.message;
      }
    }

    return {
      success,
      message,
      data: dataResult,
    };
  }
  // #endregion - @filterCommitsForPackage

  // #region - @getPackagePath
  /**
   * @description Gets the relative path of a package within the monorepo.
   * @param packageName The name of the package.
   * @returns The relative path to the package directory.
   */
  public async getPackagePath(
    packageName: string
  ): FunctionResultPromise<string | null> {
    let success: boolean = false;
    let message: string = "";
    let data: string | null = null;

    try {
      const packages = await this.getPackages();
      if (!packages.success || !packages.data) {
        throw new Error(packages.message);
      }

      // Find the package and determine its path
      for (const workspace of this.config.workspaces) {
        const packagePaths = await fg(workspace, {
          cwd: process.cwd(),
          ignore: ignorePaths,
          onlyFiles: false,
          absolute: false, // We want relative paths
        });

        for (const packagePath of packagePaths) {
          const packageJsonPath = path.join(
            process.cwd(),
            packagePath,
            "package.json"
          );
          if (dirExists(packageJsonPath)) {
            const packageJsonContent = await readJsonFile(packageJsonPath);
            if (packageJsonContent && packageJsonContent.name === packageName) {
              success = true;
              message = "Package path found successfully.";
              data = packagePath + "/"; // Add trailing slash for path matching
              return { success, message, data };
            }
          }
        }
      }

      throw new Error(`Package '${packageName}' not found in workspaces`);
    } catch (error) {
      success = false;
      message = `Failed to get package path: ${error instanceof Error ? error.message : String(error)}`;
    }

    return { success, message, data };
  }
  // #endregion - @getPackagePath
}

export default MonorepoProvider;
