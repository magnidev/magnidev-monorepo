/**
 * @name VersionReleaseService
 * @file src/lib/versionReleaseService.ts
 * @description Service to handle version bumping, git tagging, GitHub releases, and npm publishing
 */

import semver from "semver";
import fs from "node:fs/promises";
import path from "node:path";

import type { FunctionResultPromise } from "@/types";
import type { VersionType } from "@/types/repository";
import RepositoryClient from "@lib/repositoryClient";

export type VersionBumpOptions = {
  packageName?: string;
  versionType: VersionType;
  prereleaseId?: string;
  customTag?: string;
  configPreReleaseIdentifier?: string;
};

export class VersionReleaseService {
  private repositoryClient: RepositoryClient;

  constructor(repositoryClient: RepositoryClient) {
    this.repositoryClient = repositoryClient;
  }
  /**
   * Performs the complete version bump and git tagging workflow
   */
  async executeVersionRelease(
    options: VersionBumpOptions
  ): FunctionResultPromise<{
    oldVersion: string;
    newVersion: string;
    tagName: string;
  }> {
    try {
      // Get repository type
      const repoType = await this.repositoryClient.getRepoType();
      if (!repoType.success || !repoType.data) {
        return { success: false, message: repoType.message };
      } // Get configuration
      const configResult =
        repoType.data === "monorepo"
          ? await this.repositoryClient.monorepoProvider.getConfig()
          : await this.repositoryClient.singleProvider.getConfig();

      if (!configResult.success || !configResult.data) {
        return { success: false, message: configResult.message };
      }

      // Add config preReleaseIdentifier to options
      const enhancedOptions = {
        ...options,
        configPreReleaseIdentifier:
          configResult.data.release?.preReleaseIdentifier,
      }; // Update version
      const versionResult = await this.updateVersion(
        repoType.data,
        enhancedOptions
      );
      if (!versionResult.success || !versionResult.data) {
        return { success: false, message: versionResult.message };
      }

      const { oldVersion, newVersion } = versionResult.data;

      // Create git tag
      const tagResult = await this.createGitTag(
        repoType.data,
        configResult.data,
        enhancedOptions,
        newVersion
      );
      if (!tagResult.success || !tagResult.data) {
        return { success: false, message: tagResult.message };
      }
      const tagName = tagResult.data;

      return {
        success: true,
        message: "Version release completed successfully",
        data: {
          oldVersion,
          newVersion,
          tagName,
        },
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Updates the version in package.json file(s)
   */
  private async updateVersion(
    repoType: "single" | "monorepo",
    options: VersionBumpOptions
  ): FunctionResultPromise<{ oldVersion: string; newVersion: string }> {
    try {
      let oldVersion: string;
      let newVersion: string;

      if (repoType === "single") {
        const packageResult =
          await this.repositoryClient.singleProvider.getPackage();
        if (!packageResult.success || !packageResult.data) {
          return { success: false, message: packageResult.message };
        }

        oldVersion = packageResult.data.version;
        newVersion = this.calculateNewVersion(oldVersion, options);

        // Update package.json
        const packageJsonPath = path.join(process.cwd(), "package.json");
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, "utf-8")
        );
        packageJson.version = newVersion;
        await fs.writeFile(
          packageJsonPath,
          JSON.stringify(packageJson, null, 2) + "\n"
        );
      } else {
        const packageResult =
          await this.repositoryClient.monorepoProvider.getPackageByName(
            options.packageName!
          );
        if (!packageResult.success || !packageResult.data) {
          return { success: false, message: packageResult.message };
        }

        oldVersion = packageResult.data.version;
        newVersion = this.calculateNewVersion(oldVersion, options);

        // Find and update the specific package's package.json
        const packagesDir = path.join(process.cwd(), "packages");
        const packageDirs = await fs.readdir(packagesDir);

        for (const dir of packageDirs) {
          const packageJsonPath = path.join(packagesDir, dir, "package.json");
          try {
            const packageJson = JSON.parse(
              await fs.readFile(packageJsonPath, "utf-8")
            );
            if (packageJson.name === options.packageName) {
              packageJson.version = newVersion;
              await fs.writeFile(
                packageJsonPath,
                JSON.stringify(packageJson, null, 2) + "\n"
              );
              break;
            }
          } catch (error) {
            continue;
          }
        }
      }

      return {
        success: true,
        message: "Version updated successfully",
        data: { oldVersion, newVersion },
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update version",
      };
    }
  }
  /**
   * Calculates the new version based on options
   */
  private calculateNewVersion(
    currentVersion: string,
    options: VersionBumpOptions
  ): string {
    if (options.customTag) {
      return options.customTag;
    }

    const versionType = options.versionType as semver.ReleaseType;

    if (versionType === "prerelease") {
      // Use config preReleaseIdentifier first, then fallback to CLI option
      const prereleaseId =
        options.configPreReleaseIdentifier || options.prereleaseId || "alpha";
      return semver.inc(currentVersion, versionType, prereleaseId) || "";
    } else {
      return semver.inc(currentVersion, versionType) || "";
    }
  }

  /**
   * Creates and pushes git tag
   */
  private async createGitTag(
    repoType: "single" | "monorepo",
    config: any,
    options: VersionBumpOptions,
    newVersion: string
  ): FunctionResultPromise<string> {
    try {
      const gitClient = this.repositoryClient.gitClient;
      let tagFormat: string;
      if (repoType === "single") {
        tagFormat = config.release.tagFormat.replace("${version}", newVersion);
      } else {
        // For monorepo: handle both fixed and independent versioning
        if (config.release.versioningStrategy === "fixed") {
          // Fixed versioning uses v${version} format
          tagFormat = `v${newVersion}`;
        } else {
          // Independent versioning uses ${name}@${version} format
          tagFormat = config.release.tagFormat
            .replace("${name}", options.packageName!)
            .replace("${version}", newVersion);
        }
      }

      const tagMessage =
        repoType === "single"
          ? `Release ${newVersion}`
          : `Release ${options.packageName}@${newVersion}`;

      const tagResult = await gitClient.createTag(tagFormat, tagMessage);
      if (!tagResult.success) {
        return { success: false, message: tagResult.message };
      }

      const pushResult = await gitClient.pushTags();
      if (!pushResult.success) {
        return { success: false, message: pushResult.message };
      }

      return {
        success: true,
        message: "Git tag created and pushed successfully",
        data: tagFormat,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to create git tag",
      };
    }
  }
}
