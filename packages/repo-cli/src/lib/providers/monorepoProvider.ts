/**
 * @name monorepoProvider
 * @file src/lib/providers/monorepoProvider.ts
 * @description Class to manage monorepo project information and configuration
 */

import path from "node:path";
import fg from "fast-glob";

import type { FunctionResultPromise } from "@/types";
import type {
  monorepoConfig,
  monorepoPackageJson,
} from "@/types/providers/monorepoProvider";
import {
  monorepoConfigSchema,
  monorepoPackageJsonSchema,
} from "@schemas/providers/monorepoSchemas";
import { dirExists, readJsonFile, writeJsonFile } from "@utils/files";
import { ignorePaths } from "@utils/ignorePaths";

class MonorepoProvider {
  public config: monorepoConfig = {
    release: {
      tagFormat: "${name}@${version}",
      versioningStrategy: "independent",
      preReleaseIdentifier: "canary", // Default identifier for pre-release versions
    },
    workspaces: ["packages/*"],
    repoType: "monorepo",
  };

  constructor() {}

  // #region - @parseConfig
  /**
   * @description Parses and validates the provided configuration object for a monorepo project.
   * @param config The configuration object to parse.
   * @returns {FunctionResultPromise<monorepoConfig | null>} A promise that resolves to a FunctionResult containing the parsed configuration or an error message.
   */
  private async parseConfig(
    config: monorepoConfig | null
  ): FunctionResultPromise<monorepoConfig | null> {
    let success: boolean = false;
    let message: string = "";
    let data: monorepoConfig | null = null;

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
   * @returns {FunctionResultPromise<monorepoPackageJson | null>} A promise that resolves to a FunctionResult containing the parsed package.json or an error message.
   */
  public async parsePackageJson(
    packageJson: monorepoPackageJson | null
  ): FunctionResultPromise<monorepoPackageJson | null> {
    let success: boolean = false;
    let message: string = "";
    let data: monorepoPackageJson | null = null;

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
   * @returns {FunctionResultPromise<monorepoConfig | null>} A promise that resolves to a FunctionResult containing the monorepo project configuration or an error message.
   */
  public async getConfig(): FunctionResultPromise<monorepoConfig | null> {
    let success: boolean = false;
    let message: string = "";
    let data: monorepoConfig | null = null;

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
   * @returns {FunctionResultPromise<monorepoConfig | null>} A promise that resolves to a FunctionResult containing the initialized configuration or an error message.
   */
  public async init(
    userConfig: monorepoConfig
  ): FunctionResultPromise<monorepoConfig | null> {
    let success: boolean = false;
    let message: string = "";
    let data: monorepoConfig | null = null;

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
   * @returns {FunctionResultPromise<monorepoPackageJson[] | null>} A promise that resolves to a FunctionResult containing an array of package.json objects or an error message.
   */
  public async getPackages(): FunctionResultPromise<
    monorepoPackageJson[] | null
  > {
    let success: boolean = false;
    let message: string = "";
    let data: monorepoPackageJson[] | null = null;

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
      const packages: monorepoPackageJson[] = [];
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
   * @returns {FunctionResultPromise<monorepoPackageJson | null>} A promise that resolves to a FunctionResult containing the package.json object or an error message.
   */
  public async getPackageByName(
    packageName: string
  ): FunctionResultPromise<monorepoPackageJson | null> {
    let success: boolean = false;
    let message: string = "";
    let data: monorepoPackageJson | null = null;

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
}

export default MonorepoProvider;
