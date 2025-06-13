# ✨ Monorepo for @magnidev tools, packages and apps

Welcome to the official monorepo for all tools, libraries, and applications developed by the Magni Development team.

---

## 🚀 Overview

This repository serves as the single source of truth for all @magnidev projects. By centralizing our codebase, we streamline dependency management, encourage code sharing, and simplify collaboration across teams.

---

## 📦 Packages & Apps

The monorepo is organized into the following main packages and applications:

- **frontend-utils**: Shared utilities for frontend projects.
- **repo-cli**: Command-line tools for repository management.
- **theme**: Shared theme and styling resources.
- **typescript-config**: Base TypeScript configurations for consistency across projects.

> Explore each package’s directory for more details and individual documentation.

---

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [pnpm](https://pnpm.io/) (for fast, disk-efficient package management)
- [Git](https://git-scm.com/)

### Installation

Clone the repository and install dependencies:

```sh
git clone https://github.com/magnidev/magnidev-monorepo.git
cd magnidev-monorepo
pnpm install
```

### Useful Commands

- Build all packages:  
  `pnpm build`
- Run tests for all packages:  
  `pnpm test`
- Lint all packages:  
  `pnpm lint`
- Run a specific package script:  
  `pnpm --filter <package-name> <script>`

---

## 🤝 Contributing

We welcome contributions from everyone! To get started:

1. Read our [Contribution Guidelines](https://github.com/magnidev/magnidev-monorepo/blob/main/CONTRIBUTING.md).
2. Check for existing [issues](https://github.com/magnidev/magnidev-monorepo/issues) and [pull requests](https://github.com/magnidev/magnidev-monorepo/pulls).
3. For significant changes, please open an issue to discuss your proposal before submitting a PR.

---

## 📚 Documentation

- Each package contains its own `README.md` with usage and API details.
- For monorepo management, see [pnpm workspaces](https://pnpm.io/workspaces) and [Turborepo](https://turbo.build/).

---

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/magnidev/magnidev-monorepo/blob/main/LICENSE) file for details.

---

## 💬 Questions & Support

For help, open an issue, start a discussion in the repository or contact us directly at [contact@magni.dev](mailto:contact@magni.dev).

---
