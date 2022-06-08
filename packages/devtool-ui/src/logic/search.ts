import { useStorage } from "@vueuse/core";
import { computed } from "vue";
import Fuse from "fuse.js";
import { list, listMode } from "./state";

export const searchText = useStorage("vite-inspect-search-text", "");
export const includeNodeModules = useStorage(
  "vite-inspect-include-node-modules",
  false
);
export const includeVirtual = useStorage("vite-inspect-include-virtual", false);

export const searchResults = computed(() => {
  let data = list.data?.modules || [];

  if (!includeNodeModules.value)
    data = data.filter((item) => !item.id.includes("/node_modules/"));

  if (!includeVirtual.value) data = data.filter((item) => !item.virtual);

  if (!searchText.value) return data;


  // graph mode use filter avoid too much noise
  if (listMode.value === "graph") {
    return data.filter((i) => i.id.includes(searchText.value));
  }

  const fuse = new Fuse(data, {
    shouldSort: true,
    keys: ["id", "plugin"],
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: searchText.value.length * 0.8,
  });

  const r = fuse.search(searchText.value).sort((a, b) => a.score! - b.score!);
  return r.map((i) => i.item);
});
