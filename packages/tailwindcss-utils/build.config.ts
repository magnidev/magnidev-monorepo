import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    {
      input: "src/index.ts",
      format: "esm",
    },
    {
      input: "src/index.ts",
      format: "cjs",
      ext: "cjs",
      declaration: false,
    },
  ],
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
  },
  outDir: "dist",
  externals: ["react", "react-dom", "zod"],
});
