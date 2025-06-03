/**
 * @name MonorepoProjectProvider
 * @file src/lib/providers/monorepoProjectProvider.ts
 * @description Class to manage monorepo project information and configuration
 */

import path from "node:path";

import type { FunctionResult, MonorepoProjectConfig } from "@/types";
import { dirExists, readJsonFile, writeJsonFile } from "@/utils/files";
import { monorepoProjectConfigSchema } from "@/schemas/providers/monorepoProject";

export const defaultMonorepoProjectConfig: MonorepoProjectConfig = {
  release: {
    tagFormat: "${name}@${version}",
    versioningStrategy: "independent",
  },
  workspaces: ["packages/*"],
};

class MonorepoProjectProvider {
  constructor() {}

  // #region Parsing Config
  /**
   * @param config The configuration object to parse.
   * @description Parses and validates the provided configuration object for a monorepo project.
   * @returns A promise that resolves to a FunctionResult containing the parsed configuration or an error message.
   */
  private async parseConfig(
    config: MonorepoProjectConfig | null
  ): Promise<FunctionResult<MonorepoProjectConfig | null>> {
    let success: boolean = false;
    let message: string = "";
    let data: MonorepoProjectConfig | null = null;

    try {
      if (!config) {
        throw new Error("No configuration provided.");
      }

      const parsedConfig =
        await monorepoProjectConfigSchema.safeParseAsync(config);

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
  // #endregion

  // #region Loading Config
  /**
   * @description Loads the configuration for a monorepo project repository.
   * @returns A promise that resolves to a FunctionResult containing the configuration or an error message.
   */
  public async getConfig(): Promise<
    FunctionResult<MonorepoProjectConfig | null>
  > {
    let success: boolean = false;
    let message: string = "";
    let data: MonorepoProjectConfig | null = null;

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
  // #endregion

  // #region Initializing Config
  /**
   * @description Initializes the repository configuration for a monorepo project.
   * @param userConfig The user-defined configuration for the monorepo project.
   * @returns A promise that resolves to a FunctionResult indicating success or failure.
   */
  public async init(
    userConfig: MonorepoProjectConfig
  ): Promise<FunctionResult<MonorepoProjectConfig | null>> {
    let success: boolean = false;
    let message: string = "";
    let data: MonorepoProjectConfig | null = null;

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
  // #endregion
}

export default MonorepoProjectProvider;
