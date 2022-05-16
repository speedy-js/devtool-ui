import type { SpeedyBundler } from "@speedy-js/speedy-core";
import type { Metafile, SpeedyPlugin } from "@speedy-js/speedy-types";
import { uiPath } from "@speedy-js/devtool-ui";
import koa from "koa";
import mount from "koa-mount";
import serve from "koa-static";
import path from "path";
import { ModuleInfo, TransformInfo } from "@speedy-js/devtool-type";
//@ts-ignore
import detect from "detect-port";

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

let serveStart = false;
const dummyLoadPluginName = "speedy-devtool";

export function SpeedyDevtoolPlugin(
  config: ISpeedyDevtoolConfig | boolean | undefined
): SpeedyPlugin {
  return {
    name: dummyLoadPluginName,
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
      let pluginSet = new Set<string>();
      function clear() {
        console.log("clear", new Error().stack);
        transformMap = {};
        idMap = {};
        moduleGraph = { inputs: {}, outputs: {} };
      }

      function resolveId(id = ""): string {
        // console.log('id',id)
        // if (id.startsWith("./"))
        //   id = path.resolve(bundler.config.root, id).replace(/\\/g, "/");
        return resolveIdRec(id);
      }

      function resolveIdRec(id: string): string {
        return idMap[id] ? resolveIdRec(idMap[id]) : id;
      }

      // bundler.hooks.startCompilation.tapPromise(
      //   "speedy-devtool",
      //   async () => {}
      // );

      const hookList = [
        "resolve",
        "load",
        "compilation",
        "transform",
        "transformHTML",
        "startCompilation",
        "endCompilation",
        "watchChange",
      ] as const;
      for (const k of hookList) {
        bundler.hooks[k].intercept({
          register(args) {
            pluginSet.add(args.name);
            const name = args.name;
            const oldfn = args.fn;
            type F = Parameters<typeof bundler.hooks.load.tap>[1];
            if (args.type === "sync") {
              args.fn = (...args: Parameters<F>) => {
                // const id = args[0]?.path?.split("?")?.[0];
                const id = args[0]?.path;
                const start = Date.now();
                const _result = oldfn.apply(bundler, args);
                const end = Date.now();
                if (_result?.path && id && _result?.path !== id) {
                  // idMap[_result.path] = id;
                  idMap[id] = _result.path;
                }
                if (_result && id) {
                  const result = (
                    _result.contents ??
                    _result.code ??
                    _result.path ??
                    "__EMPTY__"
                  ).toString();
                  putInfoTransformMap(id, {
                    name: name,
                    result,
                    start,
                    end,
                  });
                }

                return _result;
              };
            } else {
              args.fn = async (...args: Parameters<F>) => {
                // const id = args[0]?.path?.split("?")?.[0];
                const id = args[0]?.path;

                const start = Date.now();
                const _result = await oldfn.apply(bundler, args);
                const end = Date.now();

                if (_result?.path && id && _result?.path !== id) {
                  // idMap[ _result.path] = id
                  idMap[id] = _result.path;
                }

                if (_result && id) {
                  const result = (
                    _result.contents ??
                    _result.code ??
                    _result.path ??
                    "__EMPTY__"
                  ).toString();
                  putInfoTransformMap(id, {
                    name: name,
                    result,
                    start,
                    end,
                  });
                }
                return _result;
              };
            }
            return args;
          },
        });
      }

      // bundler.hooks.resolve.intercept({
      //   register(args) {
      //     pluginSet.add(args.name);
      //     const oldfn = args.fn;
      //     type F = Parameters<typeof bundler.hooks.resolve.tap>[1];
      //     args.fn = async (...args: Parameters<F>) => {
      //       const resolve = args[0];

      //       const _result = await oldfn.apply(bundler, args);
      //       if (_result) {
      //         idMap[resolve.path] = _result.path;
      //       }

      //       return _result;
      //     };
      //     return args;
      //   },
      // });

      bundler.hooks.processManifest.tapPromise(
        dummyLoadPluginName,
        async (args) => {
          moduleGraph = resolveModuleGraphToAbsolutePath(
            bundler.config.root,
            args.metafile
          );
        }
      );
      interface PluginMetricInfo {
        name: string;
        totalTime: number;
        invokeCount: number;
        enforce?: string;
      }
      function getPluginMetics() {
        const map: Record<string, PluginMetricInfo> = {};

        pluginSet.forEach((i) => {
          map[i] = {
            name: i,
            enforce: i,
            invokeCount: 0,
            totalTime: 0,
          };
        });

        Object.values(transformMap).forEach((transformInfos) => {
          transformInfos.forEach(({ name, start, end }) => {
            if (name === dummyLoadPluginName) return;
            if (!map[name]) map[name] = { name, totalTime: 0, invokeCount: 0 };
            map[name].totalTime += end - start;
            map[name].invokeCount += 1;
          });
        });

        const metrics = Object.values(map)
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name))
          .sort((a, b) => b.invokeCount - a.invokeCount)
          .sort((a, b) => b.totalTime - a.totalTime);
        // console.log("metrics", metrics);
        return metrics;
      }

      bundler.hooks.initialize.tapPromise(dummyLoadPluginName, async () => {
        if (serveStart) return;
        serveStart = true;
        const app = new koa({});
        app.use(mount("/__inspect", serve(uiPath)));
        app.use(
          mount("/__inspect_api", (context, next) => {
            const pathname = context.path;
            if (pathname === "/list") {
              const modules = Object.keys(transformMap)
                .sort()
                .map((id: string): ModuleInfo => {
                  const plugins = transformMap[resolveId(id)]?.map((i) => i.name);
                  const input = moduleGraph?.inputs[id];
                  let deps: string[] = [];
                  if (module) {
                    deps = (input?.imports || [])
                      .filter(Boolean)
                      .map(($) => $.path);
                  }
                  return {
                    deps,
                    id: resolveId(id),
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
                resolvedId: resolveId(id),
                transforms: transformMap[id] ||  transformMap[resolveId(id)]  ||  [],
              };
            } else if (pathname === "/resolve") {
              const id = context.query.id as string;
              context.body = {
                id: resolveId(id),
              };
            } else if (pathname === "/clear") {
              // clear();
              context.body = {};
            } else if (pathname === "/pluginMetics") {
              const data = getPluginMetics();
              context.body = { data };
            } else {
              next();
            }
          })
        );
        detect((<any>config).port ?? 4399).then((p: number) => {
          app.listen(p, () => {
            console.log(`inspect url: http://localhost:${p}/__inspect`);
          });
        });
      });
    },
  };
}
