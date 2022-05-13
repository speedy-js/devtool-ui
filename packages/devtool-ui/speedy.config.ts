import { defineConfig } from "@speedy-js/speedy-core";
import { unplugin } from "@speedy-js/unplugin";
import vuePlugin from "rollup-plugin-vue";
import WindiCSS from "rollup-plugin-windicss";
import Icon from "unplugin-icons/rollup";
import path from "path";
import { SpeedyDevtoolPlugin } from "@speedy-js/devtool-plugin";
import ElementPlus from 'unplugin-element-plus/rollup'

const windi = WindiCSS({
  scan: {
    dirs: [path.resolve(__dirname, "src")],
  },
});
export default defineConfig({
  output: {
    path: "dist",
    publicPath: "/__inspect/",
    filename: "index",
  },
  define: {
    __VUE_PROD_DEVTOOLS__: JSON.stringify(true),
    __VUE_OPTIONS_API__: JSON.stringify(false),
  },
  input: {
    index: "src/index.ts",
  },
  plugins: [
    unplugin(vuePlugin()),
    ...windi.map(unplugin),
    unplugin(Icon()),
    SpeedyDevtoolPlugin( process.env.NODE_ENV !== 'production'),
    unplugin(ElementPlus()),
  ],
  html: { title: "speedy devtool" },
});
