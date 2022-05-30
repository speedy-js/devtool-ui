import { useFetch, createEventHook, useStorage } from "@vueuse/core";
import { reactive, computed } from "vue";
import { ModuleInfo } from "@speedy-js/devtool-type";

export const onRefetch = createEventHook<void>();
export const enableDiff = useStorage("vite-inspect-diff", true);
export const modes = ["detailed", "list", "tree", "graph"] as const;
export type Modes = typeof modes[number];
export const listMode = useStorage<Modes>("vite-inspect-mode", "detailed");
export const lineWrapping = useStorage("vite-inspect-line-wrapping", false);

export const list = reactive(
  useFetch("/__inspect_api/list")
    .get()
    .json<{ root: string; modules: ModuleInfo[] }>()
);

export function toggleMode() {
  listMode.value = modes[(modes.indexOf(listMode.value) + 1) % modes.length];
}

export const root = computed(() => list.data?.root || "");

export function refetch() {
  onRefetch.trigger();
  pluginMetics.execute();
  return list.execute();
}

export const pluginMetics = reactive(
  useFetch("/__inspect_api/pluginMetics").get().json<any>()
);
export function refetchPluginMetics() {
  // onRefetch.trigger();
  // return pluginMetics.execute();
}

export const openDiffByCode = (id: string, from: number, to: number) => {
  const url = `/__inspect_api/diff-code?id=${encodeURIComponent(
    id
  )}&from=${from}&to=${to}`;
  fetch(url);
};
