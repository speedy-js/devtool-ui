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
import child_process from "child_process";
import os from "os";
import fs from "fs";

const random = () => {
  return Math.random().toString(36).slice(2);
};

const ext = (s: string) => {
  return s.split("?")[0].split(".").at(-1);
};

const OriginName = "Origin";
export interface ISpeedyDevtoolConfig {
  // weather to enable devtool
  // default to false
  enable: boolean;
  // default to false
  // open: boolean;
  // default to 4899 -> findport will auto detach one when confict
  port: number;
}
interface EnhanceMetaFile extends Metafile {
  inputGraph: Record<string, Set<string>>;
  depGraph: Record<string, Set<string>>;
}
const VirtualPathProxyNameSpace = "VirtualPathProxyNamespace";
function resolveModuleGraphToAbsolutePath(
  root: string,
  metaFile: Metafile
): EnhanceMetaFile {
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

  const inputGraph: Record<string, Set<string>> = {};
  const depGraph: Record<string, Set<string>> = {};

  for (const key of Object.keys(inputRes)) {
    const inputSet = inputGraph[key] ?? new Set();
    for (const i of inputRes[key].imports) {
      const depSet = depGraph[i.path] ?? new Set();
      depSet.add(key);
      inputSet.add(i.path);
      depGraph[i.path] = depSet;
    }
    inputGraph[key] = inputSet;
  }

  return { inputs: inputRes, inputGraph, depGraph, outputs: metaFile.outputs };
}

let serveStart = false;
const dummyLoadPluginName = "speedy:devtool";

export function SpeedyDevtoolPlugin(
  config?: Partial<ISpeedyDevtoolConfig>
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

      const { port = 4399 } = config;
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
      let moduleGraph:
        | (Metafile & {
            inputGraph: Record<string, Set<string>>;
            depGraph: Record<string, Set<string>>;
          })
        | undefined;
      let pluginSet = new Set<string>();

      function resolveId(id = ""): string {
        return resolveIdRec(id);
      }

      function resolveIdRec(id: string): string {
        return idMap[id] ? resolveIdRec(idMap[id]) : id;
      }

      const hookList = [
        "initialize",
        "environment",
        "compilation",
        "resolve",
        "load",
        "transform",
        "processAsset",
        "startCompilation",
        "endCompilation",
        "processAssets",
        "processManifest",
        "beforeEmit",
        "transformHTML",
        "done",
      ] as const;

      let prevConfig = JSON.stringify(bundler.config, null, 2);
      putInfoTransformMap("speedy:config", {
        name: OriginName,
        result: prevConfig,
        start: 0,
        end: 0,
        hook: "",
      });

      for (const hook of hookList) {
        bundler.hooks[hook].intercept({
          // @ts-expect-error
          register(args) {
            pluginSet.add(args.name);
            const name = args.name;
            const oldfn = args.fn;
            type F = Parameters<typeof bundler.hooks.load.tap>[1];
            if (args.type === "sync") {
              args.fn = (...args: Parameters<F>) => {
                // const id = args[0]?.path?.split("?")?.[0];
                const arg = args[0];
                const id = arg?.path;
                const start = Date.now();
                const oldConfig = JSON.stringify(bundler.config, null, 2);
                const _result = oldfn.apply(bundler, args);
                const newConfig = JSON.stringify(bundler.config, null, 2);

                const end = Date.now();
                if (_result?.path && id && _result?.path !== id) {
                  // idMap[_result.path] = id;
                  idMap[id] = _result.path;
                }

                const result = (
                  _result?.contents ??
                  _result?.code ??
                  _result?.path ??
                  ""
                ).toString();

                if (newConfig !== oldConfig && newConfig !== prevConfig) {
                  prevConfig = newConfig;
                  putInfoTransformMap("speedy:config", {
                    name: name,
                    result: prevConfig,
                    start,
                    end,
                    hook,
                  });
                }

                if (_result && id) {
                  if (!transformMap[id]) {
                    // @ts-ignore
                    const input = arg?.content ?? arg?.code ?? arg?.path ?? "";
                    putInfoTransformMap(id, {
                      name: OriginName,
                      result: input,
                      start,
                      end,
                      hook,
                    });
                  }

                  putInfoTransformMap(id, {
                    name: name,
                    result,
                    start,
                    end,
                    hook,
                  });
                }

                return _result;
              };
            } else if (args.type === "promise") {
              args.fn = async (...args: Parameters<F>) => {
                // const id = args[0]?.path?.split("?")?.[0];
                const arg = args[0];
                const id = arg?.path;
                const start = Date.now();
                const oldConfig = JSON.stringify(bundler.config, null, 2);
                const _result = await oldfn.apply(bundler, args);
                const newConfig = JSON.stringify(bundler.config, null, 2);
                const end = Date.now();

                if (_result?.path && id && _result?.path !== id) {
                  // idMap[ _result.path] = id
                  idMap[id] = _result.path;
                }
                const result = (
                  _result?.contents ??
                  _result?.code ??
                  _result?.path ??
                  ""
                ).toString();

                if (newConfig !== oldConfig && newConfig !== prevConfig) {
                  prevConfig = newConfig;
                  putInfoTransformMap("speedy:config", {
                    name: name,
                    result: prevConfig,
                    start,
                    end,
                    hook,
                  });
                }

                if (_result && id) {
                  if (!transformMap[id]) {
                    //@ts-ignore
                    const input = arg?.content ?? arg?.code ?? arg?.path ?? "";
                    putInfoTransformMap(id, {
                      name: OriginName,
                      result: input,
                      start,
                      end,
                      hook,
                    });
                  }

                  putInfoTransformMap(id, {
                    name: name,
                    result,
                    start,
                    end,
                    hook,
                  });
                }
                return _result;
              };
            }
            return args;
          },
        });
      }

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
          .filter((i) => !!i && i.name !== OriginName)
          .sort((a, b) => a.name.localeCompare(b.name))
          .sort((a, b) => b.invokeCount - a.invokeCount)
          .sort((a, b) => b.totalTime - a.totalTime);
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
              const s = new Set<string>();
              const modules = Object.keys(transformMap)
                .sort()
                .map((id: string): ModuleInfo => {
                  const plugins = transformMap[resolveId(id)]?.map(
                    (i) => i.name
                  );
                  let imports: string[] = [];
                  let exports: string[] = [];
                  if (module) {
                    imports = [
                      ...(moduleGraph?.depGraph[resolveId(id)] ?? []),
                    ].filter(Boolean);
                    exports = [
                      ...(moduleGraph?.inputGraph[resolveId(id)] ?? []),
                    ].filter(Boolean);
                  }
                  return {
                    imports,
                    exports,
                    id: resolveId(id),
                    plugins,
                    virtual: false,
                  };
                })
                .filter((i) => {
                  if (s.has(i.id)) return false;
                  s.add(i.id);
                  return true;
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
                transforms:
                  transformMap[id] || transformMap[resolveId(id)] || [],
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
            } else if (pathname === "/diff-code") {
              const { id, from, to } = context.query as Record<string, string>;
              const list =
                transformMap[id] || transformMap[resolveId(id)] || [];
              const fromCode = list[+from]?.result ?? "";
              const toCode = list[+to]?.result ?? "";
              if (fromCode && toCode && fromCode !== toCode) {
                const tempDir = os.tmpdir();
                const fromPath = path.join(tempDir, random() + "." + ext(id));
                const toPath = path.join(tempDir, random() + "." + ext(id));
                fs.writeFileSync(fromPath, fromCode, "utf-8");
                fs.writeFileSync(toPath, toCode, "utf-8");
                const cmd = `code -d ${fromPath} ${toPath}`;
                child_process.exec(cmd);
              }
              context.body = {};
            } else {
              next();
            }
          })
        );
        detect(port).then((p: number) => {
          app.listen(p, () => {
            console.log(`inspect url: http://localhost:${p}/__inspect`);
          });
        });
      });
    },
  };
}
