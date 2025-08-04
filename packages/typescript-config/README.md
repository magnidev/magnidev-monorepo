# @magnidev/typescript-config

A shared TypeScript configuration for Magni Development projects.

## Installation

```bash
pnpm add @magnidev/typescript-config

npm install @magnidev/typescript-config

yarn add @magnidev/typescript-config
```

## Usage

Extend the configuration you need:

```tsx
{
  "extends": "@magnidev/typescript-config/node-base",
  "compilerOptions": {
    // ...
  }
}
```

## Available Configurations

- `node-base` For Node.js projects
- `node-library` For Node.js libraries

## Contributing

Contributions are welcome! Please see [contributing](../../CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
