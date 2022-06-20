<script setup lang="ts">
import type { Data, Options } from "vis-network";
import { Network } from "vis-network";
import { useRouter } from "vue-router";

import { computed, onMounted, ref, watch } from "vue";

import type { ModuleInfo } from "@speedy-js/devtool-type";
import {
  isDark,
  list,
  graphMode,
  searchText,
  includeNodeModules,
  includeVirtual,
} from "../logic";

const props = defineProps<{
  modules?: ModuleInfo[];
}>();

const container = ref<HTMLDivElement | null>();
const router = useRouter();
const data = computed<Data>(() => {
  const modules = props.modules || [];
  const edges: Data["edges"] = modules.flatMap((mod) => {
    const arr = graphMode.value ? mod.imports : mod.exports;
    return arr
      .filter((item) => {
        if (
          !includeNodeModules.value &&
          (item.includes("node_modules") || mod.id.includes("node_modules"))
        )
          return false;
        if (!includeVirtual.value && mod.virtual) {
          return false;
        }
        return true;
      })
      .map((item: any) => ({
        from: graphMode.value ? item : mod.id,
        to: graphMode.value ? mod.id : item,
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.8,
          },
        },
      }));
  });
  const edgesNodes = edges.flatMap((i) => [i.from, i.to]);
  const s = new Set();
  const nodes: Data["nodes"] = (
    (searchText.value ? list.data?.modules : modules) ?? []
  )
    .filter((i) => edgesNodes.includes(i.id))
    .map((mod) => {
      const path = mod.id.replace(/\?.*$/, "").replace(/\#.*$/, "");
      return {
        id: mod.id,
        label: path.split("/").splice(-1)[0],
        group: path.split("/").slice(0, -1).join("/"),
        size:
          15 +
          Math.min(
            (graphMode.value ? mod.imports.length : mod.exports.length) / 2,
            8
          ),
        font: { color: isDark.value ? "white" : "black" },
        shape: mod.id.includes("/node_modules/")
          ? "hexagon"
          : mod.virtual
          ? "diamond"
          : "dot",
      };
    })
    .filter((i) => {
      if (s.has(i.id)) {
        return false;
      }
      s.add(i.id);
      return true;
    });

  const data = {
    nodes,
    edges,
  };
  return data;
});

onMounted(() => {
  const options: Options = {
    nodes: {
      shape: "dot",
      size: 16,
    },
    layout: {
      improvedLayout: false,
    },
    physics: {
      enabled: (data.value?.nodes?.length ?? 0) < 500,
      repulsion: {
        centralGravity: 0.7,
        springLength: 100,
        springConstant: 0.01,
      },
      maxVelocity: 146,
      solver: "repulsion",
      timestep: 0.35,
      stabilization: {
        iterations: 200,
      },
    },
  };
  const network = new Network(container.value!, data.value, options);

  network.on("click", (data) => {
    const node = data.nodes?.[0];
    if (node) router.push(`/module?id=${encodeURIComponent(node)}`);
  });

  watch(data, () => {
    network.setData(data.value);
  });
});
</script>

<template>
  <div v-if="modules">
    <div ref="container" class="w-full h-100vh" />
  </div>
</template>
