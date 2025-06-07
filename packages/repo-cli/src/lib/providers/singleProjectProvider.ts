/**
 * @name SingleProjectProvider
 * @file src/lib/providers/singleProjectProvider.ts
 * @description Class to manage single project information and configuration
 */

import path from "node:path";

import type {
  FunctionResultPromise,
  SingleProjectConfig,
  SingleProjectPackageJson,
} from "@/types";
import {
  singleProjectConfigSchema,
  singleProjectPackageJsonSchema,
} from "@/schemas/providers/singleProjectSchemas";
import { dirExists, readJsonFile, writeJsonFile } from "@/utils/files";

class SingleProjectProvider {
  defaultConfig: SingleProjectConfig = {
    release: {
      tagFormat: "v${version}",
    },
    publishConfig: {
      access: "public",
      registry: "https://registry.npmjs.org/",
    },
    repoType: "single",
  };

  constructor() {}

  // #region - @parseConfig
  /**
   * @description Parses and validates the provided configuration object for a single project.
   * @param config The configuration object to parse.
   * @returns {FunctionResultPromise} A promise that resolves to a FunctionResult containing the parsed configuration or an error message.
   */
  private async parseConfig(
    config: SingleProjectConfig | null
  ): FunctionResultPromise<SingleProjectConfig | null> {
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
  // #endregion - @parseConfig

  // #region - @parsePackageJson
  /**
   * @description Parses and validates the provided package.json object for a single project.
   * @param packageJson The package.json object to parse.
   * @returns {FunctionResultPromise<SingleProjectPackageJson | null>} A promise that resolves to a FunctionResult containing the parsed package.json or an error message.
   */
  public async parsePackageJson(
    packageJson: SingleProjectPackageJson | null
  ): FunctionResultPromise<SingleProjectPackageJson | null> {
    let success: boolean = false;
    let message: string = "";
    let data: SingleProjectPackageJson | null = null;

    try {
      if (!packageJson) {
        throw new Error("No package.json provided.");
      }

      const parsedPackageJson =
        await singleProjectPackageJsonSchema.safeParseAsync(packageJson);

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
   * @description Loads the configuration for a single project repository.
   * @returns {FunctionResultPromise<SingleProjectConfig | null>} A promise that resolves to a FunctionResult containing the configuration or an error message.
   */
  public async getConfig(): FunctionResultPromise<SingleProjectConfig | null> {
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
  // #endregion - @getConfig

  // #region - @init
  /**
   * @description Initializes the repository configuration for a single project or monorepo.
   * @param userConfig The user-defined configuration for the repository.
   * @returns {FunctionResultPromise<SingleProjectConfig | null>} A promise that resolves to a FunctionResult containing the initialized configuration or an error message.
   */
  public async init(
    userConfig: SingleProjectConfig
  ): FunctionResultPromise<SingleProjectConfig | null> {
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
      message = "Single Project configuration initialized successfully.";
      data = userConfigParsed.data; // Use the validated configuration data
    } catch (error) {
      success = false;
      message = `Failed to initialize repository configuration: ${error instanceof Error ? error.message : String(error)}`;
    }

    return { success, message, data };
  }
  // #endregion

  // #region Get Package
  /**
   * @description Retrieves the package.json data for a single project repository.
   * @returns {FunctionResultPromise<SingleProjectPackageJson | null>} A promise that resolves to a FunctionResult containing the package.json data or an error message.
   */
  public async getPackage(): FunctionResultPromise<SingleProjectPackageJson | null> {
    let success: boolean = false;
    let message: string = "";
    let data: SingleProjectPackageJson | null = null;

    try {
      // Load the root package.json file
      const rootPackageJsonPath = path.join(process.cwd(), "package.json");
      if (!dirExists(rootPackageJsonPath)) {
        throw new Error("No package.json found in the current directory");
      }

      // Read the root package.json file
      const rootPackageJsonContent = await readJsonFile(rootPackageJsonPath);
      if (!rootPackageJsonContent) {
        throw new Error("Failed to read package.json");
      }

      // Parse and validate the package.json content
      const rootPackageJsonParsed = await this.parsePackageJson(
        rootPackageJsonContent
      );

      if (!rootPackageJsonParsed.success || !rootPackageJsonParsed.data) {
        throw new Error(
          `Package.json validation failed: ${rootPackageJsonParsed.message}`
        );
      }

      success = true;
      message = "Package information loaded successfully.";
      data = rootPackageJsonParsed.data;
    } catch (error) {
      success = false;
      message = `Failed to load package information: ${error instanceof Error ? error.message : String(error)}`;
    }

    return { success, message, data };
  }
  // #endregion
}

export default SingleProjectProvider;
