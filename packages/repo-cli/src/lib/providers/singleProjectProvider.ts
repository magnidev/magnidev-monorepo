/**
 * @name SingleProjectProvider
 * @file src/lib/providers/singleProjectProvider.ts
 * @description Class to manage single project information and configuration
 */

import path from "node:path";

import type { FunctionResult, SingleProjectConfig } from "@/types";
import { dirExists, readJsonFile, writeJsonFile } from "@/utils/files";
import { singleProjectConfigSchema } from "@/schemas/providers/singleProject";

export const defaultSingleProjectConfig: SingleProjectConfig = {
  release: {
    tagFormat: "v${version}",
  },
  publishConfig: {
    access: "public",
    registry: "https://registry.npmjs.org/",
  },
};

class SingleProjectProvider {
  constructor() {}

  // #region Parsing Config
  /**
   * @param config The configuration object to parse.
   * @description Parses and validates the provided configuration object for a single project.
   * @returns A promise that resolves to a FunctionResult containing the parsed configuration or an error message.
   */
  private async parseConfig(
    config: SingleProjectConfig | null
  ): Promise<FunctionResult<SingleProjectConfig | null>> {
    let success: boolean = false;
    let message: string = "";
    let data: SingleProjectConfig | null = null;

    try {
      if (!config) {
        throw new Error("No configuration provided.");
      }

      const parsedConfig =
        await singleProjectConfigSchema.safeParseAsync(config);

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
   * @description Loads the configuration for a single project repository.
   * @returns A promise that resolves to a FunctionResult containing the configuration or an error message.
   */
  public async getConfig(): Promise<
    FunctionResult<SingleProjectConfig | null>
  > {
    let success: boolean = false;
    let message: string = "";
    let data: SingleProjectConfig | null = null;

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
   * @description Initializes the repository configuration for a single project or monorepo.
   * @param userConfig The user-defined configuration for the repository.
   * @returns A promise that resolves to a FunctionResult indicating success or failure.
   */
  public async init(
    userConfig: SingleProjectConfig
  ): Promise<FunctionResult<SingleProjectConfig | null>> {
    let success: boolean = false;
    let message: string = "";
    let data: SingleProjectConfig | null = null;

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

      // Write the validated configuration to the package.json file
      await writeJsonFile(rootPackageJsonPath, userConfigParsed.data);

      success = true;
      message = "Single Project configuration initialized successfully.";
      data = userConfigParsed.data; // Use the validated configuration data
    } catch (error) {
      success = false;
      message = `Failed to initialize repository configuration: ${error instanceof Error ? error.message : String(error)}`;
    }

    return { success, message, data };
  }
  // #endregion
}

export default SingleProjectProvider;
