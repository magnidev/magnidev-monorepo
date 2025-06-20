/**
 * @name WorkflowGenerator
 * @file src/utils/workflowGenerator.ts
 * @description Utility functions to generate GitHub workflow files
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { FunctionResultPromise } from "@/types";

/**
 * Generates GitHub workflow for single project
 */
export async function generateSingleProjectWorkflow(): FunctionResultPromise<string> {
  const workflowContent = `name: Release

on:
  push:
    tags:
      - 'v*'          # Triggers on tags like v1.0.0, v2.1.0-canary.1, etc.

env:
  NODE_VERSION: '18'

jobs:
  release:
    name: Create Release and Publish
    runs-on: ubuntu-latest
    permissions:
      contents: write        # To create releases
      id-token: write       # For npm provenance
      
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0    # Full history for proper release notes
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          registry-url: 'https://registry.npmjs.org'
          
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: latest
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Run tests
        run: pnpm test
        
      - name: Build package
        run: pnpm build
        
      - name: Extract version from tag
        id: version
        run: |
          TAG=\${GITHUB_REF#refs/tags/}
          VERSION=\${TAG#v}
          echo "version=\$VERSION" >> \$GITHUB_OUTPUT
          echo "tag=\$TAG" >> \$GITHUB_OUTPUT
          echo "is_prerelease=\$([[ \$VERSION == *"canary"* ]] && echo "true" || echo "false")" >> \$GITHUB_OUTPUT
          
      - name: Generate release notes
        id: release_notes
        run: |
          # Get previous tag for generating changelog
          PREVIOUS_TAG=\$(git describe --tags --abbrev=0 HEAD~1 2>/dev/null || echo "")
          
          if [ -z "\$PREVIOUS_TAG" ]; then
            RELEASE_NOTES="Initial release v\${{ steps.version.outputs.version }}"
          else
            RELEASE_NOTES="## Changes since \$PREVIOUS_TAG\\n\\n"
            RELEASE_NOTES="\$RELEASE_NOTES\$(git log --pretty=format:"- %s (%h)" \$PREVIOUS_TAG..HEAD)"
          fi
          
          # Save to output (escape newlines)
          echo "notes<<EOF" >> \$GITHUB_OUTPUT
          echo -e "\$RELEASE_NOTES" >> \$GITHUB_OUTPUT
          echo "EOF" >> \$GITHUB_OUTPUT
          
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: \${{ steps.version.outputs.tag }}
          release_name: Release \${{ steps.version.outputs.tag }}
          body: \${{ steps.release_notes.outputs.notes }}
          draft: false
          prerelease: \${{ steps.version.outputs.is_prerelease }}
          
      - name: Publish to npm
        run: |
          if [[ "\${{ steps.version.outputs.is_prerelease }}" == "true" ]]; then
            pnpm publish --tag canary --access public --no-git-checks
          else
            pnpm publish --access public --no-git-checks
          fi
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
`;

  try {
    const workflowDir = path.join(process.cwd(), ".github", "workflows");
    await fs.mkdir(workflowDir, { recursive: true });

    const workflowPath = path.join(workflowDir, "release.yml");
    await fs.writeFile(workflowPath, workflowContent);

    return {
      success: true,
      message: "Single project GitHub workflow created successfully",
      data: workflowPath,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create workflow: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Generates GitHub workflow for monorepo
 */
export async function generateMonorepoWorkflow(): FunctionResultPromise<string> {
  const workflowContent = `name: Monorepo Release

on:
  push:
    tags:
      - 'v*'           # Fixed versioning: v1.0.0
      - '@*@*'         # Independent versioning: @org/package@1.0.0

env:
  NODE_VERSION: '18'

jobs:
  detect-release-type:
    name: Detect Release Type
    runs-on: ubuntu-latest
    outputs:
      is_fixed: \${{ steps.detect.outputs.is_fixed }}
      package_name: \${{ steps.detect.outputs.package_name }}
      version: \${{ steps.detect.outputs.version }}
      tag: \${{ steps.detect.outputs.tag }}
      is_prerelease: \${{ steps.detect.outputs.is_prerelease }}
      
    steps:
      - name: Detect release type and extract info
        id: detect
        run: |
          TAG=\${GITHUB_REF#refs/tags/}
          echo "tag=\$TAG" >> \$GITHUB_OUTPUT
          
          if [[ \$TAG =~ ^v[0-9] ]]; then
            # Fixed versioning: v1.0.0
            echo "is_fixed=true" >> \$GITHUB_OUTPUT
            VERSION=\${TAG#v}
            echo "version=\$VERSION" >> \$GITHUB_OUTPUT
            echo "package_name=" >> \$GITHUB_OUTPUT
          else
            # Independent versioning: @org/package@1.0.0
            echo "is_fixed=false" >> \$GITHUB_OUTPUT
            PACKAGE_NAME=\${TAG%@*}
            VERSION=\${TAG##*@}
            echo "package_name=\$PACKAGE_NAME" >> \$GITHUB_OUTPUT
            echo "version=\$VERSION" >> \$GITHUB_OUTPUT
          fi
          
          # Check if prerelease
          echo "is_prerelease=\$([[ \$VERSION == *"canary"* ]] && echo "true" || echo "false")" >> \$GITHUB_OUTPUT

  release-fixed:
    name: Release All Packages (Fixed Versioning)
    if: needs.detect-release-type.outputs.is_fixed == 'true'
    needs: detect-release-type
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
      
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Setup Node.js and pnpm
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          registry-url: 'https://registry.npmjs.org'
          
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: latest
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Run tests
        run: pnpm test
        
      - name: Build all packages
        run: pnpm build
        
      - name: Generate release notes
        id: release_notes
        run: |
          PREVIOUS_TAG=\$(git describe --tags --abbrev=0 HEAD~1 2>/dev/null || echo "")
          
          if [ -z "\$PREVIOUS_TAG" ]; then
            RELEASE_NOTES="Initial release \${{ needs.detect-release-type.outputs.tag }}"
          else
            RELEASE_NOTES="## Changes since \$PREVIOUS_TAG\\n\\n"
            RELEASE_NOTES="\$RELEASE_NOTES\$(git log --pretty=format:"- %s (%h)" \$PREVIOUS_TAG..HEAD)"
          fi
          
          echo "notes<<EOF" >> \$GITHUB_OUTPUT
          echo -e "\$RELEASE_NOTES" >> \$GITHUB_OUTPUT
          echo "EOF" >> \$GITHUB_OUTPUT
          
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: \${{ needs.detect-release-type.outputs.tag }}
          release_name: Release \${{ needs.detect-release-type.outputs.tag }}
          body: \${{ steps.release_notes.outputs.notes }}
          prerelease: \${{ needs.detect-release-type.outputs.is_prerelease }}
          
      - name: Publish all packages
        run: |
          # Update all package versions and publish
          pnpm -r exec -- npm version \${{ needs.detect-release-type.outputs.version }} --no-git-tag-version
          
          if [[ "\${{ needs.detect-release-type.outputs.is_prerelease }}" == "true" ]]; then
            pnpm -r publish --tag canary --access public --no-git-checks
          else
            pnpm -r publish --access public --no-git-checks
          fi
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}

  release-independent:
    name: Release Single Package (Independent Versioning)
    if: needs.detect-release-type.outputs.is_fixed == 'false'
    needs: detect-release-type
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
      
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Setup Node.js and pnpm
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          registry-url: 'https://registry.npmjs.org'
          
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: latest
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Find package directory
        id: find_package
        run: |
          PACKAGE_NAME="\${{ needs.detect-release-type.outputs.package_name }}"
          
          # Find the package directory
          PACKAGE_DIR=\$(find packages -name "package.json" -exec grep -l "\\"name\\":\\s*\\"\$PACKAGE_NAME\\"" {} \\; | head -1 | xargs dirname)
          
          if [ -z "\$PACKAGE_DIR" ]; then
            echo "Package \$PACKAGE_NAME not found!"
            exit 1
          fi
          
          echo "package_dir=\$PACKAGE_DIR" >> \$GITHUB_OUTPUT
          
      - name: Run tests for package
        run: |
          cd \${{ steps.find_package.outputs.package_dir }}
          pnpm test
          
      - name: Build package
        run: |
          cd \${{ steps.find_package.outputs.package_dir }}
          pnpm build
          
      - name: Generate release notes
        id: release_notes
        run: |
          PACKAGE_NAME="\${{ needs.detect-release-type.outputs.package_name }}"
          PREVIOUS_TAG=\$(git tag -l "\$PACKAGE_NAME@*" --sort=-version:refname | head -2 | tail -1)
          
          if [ -z "\$PREVIOUS_TAG" ]; then
            RELEASE_NOTES="Initial release for \$PACKAGE_NAME@\${{ needs.detect-release-type.outputs.version }}"
          else
            RELEASE_NOTES="## Changes in \$PACKAGE_NAME since \$PREVIOUS_TAG\\n\\n"
            # Get commits that affected this package
            RELEASE_NOTES="\$RELEASE_NOTES\$(git log --pretty=format:"- %s (%h)" --oneline \$PREVIOUS_TAG..HEAD -- \${{ steps.find_package.outputs.package_dir }})"
          fi
          
          echo "notes<<EOF" >> \$GITHUB_OUTPUT
          echo -e "\$RELEASE_NOTES" >> \$GITHUB_OUTPUT
          echo "EOF" >> \$GITHUB_OUTPUT
          
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: \${{ needs.detect-release-type.outputs.tag }}
          release_name: \${{ needs.detect-release-type.outputs.package_name }}@\${{ needs.detect-release-type.outputs.version }}
          body: \${{ steps.release_notes.outputs.notes }}
          prerelease: \${{ needs.detect-release-type.outputs.is_prerelease }}
          
      - name: Publish package
        run: |
          cd \${{ steps.find_package.outputs.package_dir }}
          
          if [[ "\${{ needs.detect-release-type.outputs.is_prerelease }}" == "true" ]]; then
            pnpm publish --tag canary --access public --no-git-checks
          else
            pnpm publish --access public --no-git-checks
          fi
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
`;

  try {
    const workflowDir = path.join(process.cwd(), ".github", "workflows");
    await fs.mkdir(workflowDir, { recursive: true });

    const workflowPath = path.join(workflowDir, "release.yml");
    await fs.writeFile(workflowPath, workflowContent);

    return {
      success: true,
      message: "Monorepo GitHub workflow created successfully",
      data: workflowPath,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create workflow: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Generates a README with setup instructions
 */
export async function generateWorkflowSetupInstructions(): FunctionResultPromise<string> {
  const instructions = `# GitHub Workflow Setup

Your GitHub workflow has been created! To complete the setup, you need to configure the following:

## Required Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

### NPM_TOKEN

1. Go to [npmjs.com](https://npmjs.com) and log in
2. Go to Access Tokens > Generate New Token
3. Choose "Automation" type
4. Copy the token and add it as \`NPM_TOKEN\` secret in your GitHub repo

## Required Permissions

Make sure your repository has these permissions enabled:

1. Go to Settings > Actions > General
2. Under "Workflow permissions":
   - Select "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"

## How it works

1. Run \`repo-cli release\` to bump version and create a git tag
2. Push the tag: \`git push --tags\`
3. GitHub workflow automatically:
   - Runs tests and builds your package(s)
   - Creates a GitHub release with auto-generated notes
   - Publishes to npm with appropriate tags

## Tag Patterns

- **Single projects**: \`v1.0.0\`, \`v1.0.0-canary.1\`
- **Monorepo fixed**: \`v1.0.0\`, \`v1.0.0-canary.1\`
- **Monorepo independent**: \`@org/package@1.0.0\`, \`@org/package@1.0.0-canary.1\`

## Prerelease Support

Tags containing "canary" are automatically published as prerelease:

- GitHub release marked as prerelease
- npm published with \`--tag canary\`

Happy releasing! 🚀
`;

  try {
    const readmePath = path.join(process.cwd(), "GITHUB_WORKFLOW_SETUP.md");
    await fs.writeFile(readmePath, instructions);

    return {
      success: true,
      message: "Setup instructions created",
      data: readmePath,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create instructions: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
