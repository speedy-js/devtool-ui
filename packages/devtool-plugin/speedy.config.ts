import { builtinModules } from "module";
import { defineConfig } from "@speedy-js/speedy-core";
import { externalPlugin } from "@speedy-js/speedy-plugin-external";

export default defineConfig({
  output: {
    path: "dist",
    filename: "index",
    format:"cjs",
  },
  input: {
    index: "src/index.ts",
  },
  external: ["@speedy-js/devtool-ui"],
  target: "es6",
  minify: false,
  plugins: [externalPlugin({ external: builtinModules })],
});
