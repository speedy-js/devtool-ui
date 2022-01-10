import path from "path";
import type { SpeedyBundler } from "@speedy-js/speedy-core";
import type { Metafile, SpeedyPlugin } from "@speedy-js/speedy-types";
import { uiPath } from "@speedy-js/devtool-ui";
import koa from "koa";
import mount from "koa-mount";
import serve from "koa-static";
import { ModuleInfo, TransformInfo } from "@speedy-js/devtool-type";
//@ts-ignore
import findPort from "find-port";

import os from "os";
import chalk from 'chalk';


function getNetworkAddress() {
  for (const [key, interfaces] of Object.entries(os.networkInterfaces())) {
    if (!interfaces) {
      continue;
    }
    for (const network of interfaces) {
      const { address, family, internal } = network;
      if (family === "IPv4" && !internal) {
        return address;
      }
    }
  }
}

export interface ISpeedyDevtoolConfig {
  // weather to enable devtool
  // default to false
  enable: boolean;
  // default to false
  open: boolean;
  // default to 4899 -> findport will auto detach one when confict
  port: number;
}

const VirtualPathProxyNameSpace = "VirtualPathProxyNamespace";
function resolveModuleGraphToAbsolutePath(
  root: string,
  metaFile: Metafile
): Metafile {
  const inputs = metaFile.inputs;
  /**
   * Resolve Cache for relativePath -> absolutePath
   */
  const cache: Record<string, string> = {};

  function getFilePath(relativePath: string) {
    if (!cache[relativePath]) {
      cache[relativePath] = path.resolve(root, relativePath);
    }

    return cache[relativePath];
  }

  const inputRes: typeof inputs = {};

  for (const key of Object.keys(inputs)) {
    inputRes[getFilePath(key)] = {
      ...inputs[key],
      imports: inputs[key].imports.map(($) => {
        return { path: getFilePath($.path), kind: $.kind };
      }),
    };
  }

  return { inputs: inputRes, outputs: metaFile.outputs };
}

export function SpeedyDevtoolPlugin(
  config: ISpeedyDevtoolConfig | boolean | undefined
): SpeedyPlugin {
  return {
    name: "speedy-devtool",
    apply(bundler: SpeedyBundler) {
      /**
       * check if devtool is enabled
       */
      if (!config) {
        return;
      }
      /**
       * userConfig { enable: false } -> to disable devtool
       */
      if (typeof config === "object" && !config.enable) {
        return;
      }
      /**
       * transformMap save transformStack
       */
      let transformMap: Record<string, TransformInfo[]> = {};
      /**
       * save safe transformMap
       */
      function putInfoTransformMap(id: string, info: TransformInfo): void {
        if (id === undefined) {
          console.log(id, info, new Error("").stack);
        }
        if (!transformMap[id]) {
          transformMap[id] = [];
        }
        transformMap[id].push(info);
      }
      let idMap: Record<string, string> = {};
      let moduleGraph: Metafile | undefined;

      function clear() {
        transformMap = {};
        idMap = {};
        moduleGraph = { inputs: {}, outputs: {} };
      }

      bundler.hooks.startCompilation.tapPromise("speedy-devtool", async () => {
        clear();
      });

      bundler.hooks.load.intercept({
        register(args) {
          const name = args.name;
          const oldfn = args.fn;
          type F = Parameters<typeof bundler.hooks.load.tap>[1];
          args.fn = async (...args: Parameters<F>) => {
            const id = args[0].path;
            const start = Date.now();
            const _result = await oldfn.apply(bundler, args);
            const end = Date.now();
            if (_result) {
              putInfoTransformMap(id, {
                name: name,
                result: _result.contents,
                start,
                end,
              });
            }

            return _result;
          };
          return args;
        },
      });

      bundler.hooks.transform.intercept({
        register(args) {
          const name = args.name;
          const oldfn = args.fn;
          type F = Parameters<typeof bundler.hooks.transform.tap>[1];
          args.fn = async (...args: Parameters<F>) => {
            const id = args[0].path;
            const start = Date.now();
            const _result: Parameters<F>[0] = await oldfn.apply(bundler, args);
            const end = Date.now();
            if (_result) {
              putInfoTransformMap(id, {
                name: name,
                result: _result.code,
                start,
                end,
              });
            }
            return _result;
          };
          return args;
        },
      });

      bundler.hooks.resolve.intercept({
        register(args) {
          const oldfn = args.fn;
          type F = Parameters<typeof bundler.hooks.resolve.tap>[1];
          args.fn = async (...args: Parameters<F>) => {
            const resolve = args[0];

            const _result = await oldfn.apply(bundler, args);
            if (_result) {
              idMap[resolve.path] = _result.path;
            }

            return _result;
          };
          return args;
        },
      });

      bundler.hooks.processManifest.tapPromise(
        "speedy-devtool",
        async (args) => {
          moduleGraph = resolveModuleGraphToAbsolutePath(
            bundler.config.root,
            args.metafile
          );
        }
      );

      bundler.hooks.initialize.tapPromise("speedy-devtool", async () => {
        const app = new koa({});
        app.use(mount("/", serve(uiPath)));
        app.use(
          mount("/__inspect_api", (context, next) => {
            const pathname = context.path;
            if (pathname === "/list") {
              const modules = Object.keys(transformMap)
                .sort()
                .map((id: string): ModuleInfo => {
                  const plugins = transformMap[id]?.map((i) => i.name);
                  const input = moduleGraph?.inputs[id];
                  let deps: string[] = [];
                  if (module) {
                    deps = (input?.imports || [])
                      .filter(Boolean)
                      .map(($) => $.path);
                  }
                  return {
                    deps,
                    id,
                    plugins,
                    virtual: false,
                  };
                });
              context.body = {
                graph: moduleGraph,
                root: bundler.config.root,
                modules,
              };
            } else if (pathname === "/module") {
              const id = context.query.id as string;
              context.body = {
                resolvedId: id,
                transforms: transformMap[id] || [],
              };
            } else if (pathname === "/resolve") {
              const id = context.query.id as string;
              context.body = {
                id,
              };
            } else if (pathname === "/clear") {
              // clear();
              context.body = {};
            } else {
              next();
            }
          })
        );
        findPort("127.0.0.1", 8000, 9000, function (ports: string[]) {
          const resolvedPort = ports[0];
          app.listen(resolvedPort, (...args) => {
            const ip = getNetworkAddress();
            const localAddress = `http://${bundler.config.dev.host}:${resolvedPort}`;
            const networkAddress = `http://${ip}:${resolvedPort}`;
            const localMessage = `${chalk.bold(`- Local Address:   `)}${localAddress}`;
            const networkMessage = `${chalk.bold(`- On Your Network: `)}${networkAddress}`;
          });
        });
      });
    },
  };
}
