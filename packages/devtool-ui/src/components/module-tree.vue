<script lang="ts" setup>
import { useRouter } from "vue-router";
import { computed, onMounted, ref, watch } from "vue";
import type { ModuleInfo } from "@speedy-js/devtool-type";
import { ElTree } from "element-plus";
import "element-plus/es/components/tree/style/css";
import { root } from "../logic";
const props = defineProps<{
  modules?: ModuleInfo[];
}>();

console.log("props", root.value, props.modules);
interface Tree {
  label: string;
  children?: Tree[];
}

function toTreeData(list: ModuleInfo[], root: string): Tree[] {
  const fileList = list
    .filter((i) => i.id.startsWith("/"))
    .map((i) => ({
      ...i,
      _p: i.id.replace(root, ""),
    }))
    .sort((a, b) => a._p.localeCompare(b._p));

  const data: Tree[] = [];
  const addItem = (path: string[], value: string) => {
    let curIndex = 0;
    let curItem = data.find((i) => i.label === path[curIndex]);
    while (curIndex < path.length) {}

    for (const p of path) {
    }

    curItem?.children;
  };
  for (const i of fileList) {
    const pathList = i._p.split("/");
    const name = pathList.pop();
    if (name) addItem(pathList, name);
  }
  return data;
}

const treeData = toTreeData(props.modules ?? [], root.value);
console.log("treeData", treeData);
const handleNodeClick = (data: Tree) => {
  console.log(data);
};

const data: Tree[] = [
  {
    label: "Level one 1",
    children: [
      {
        label: "Level two 1-1",
        children: [
          {
            label: "Level three 1-1-1",
          },
        ],
      },
    ],
  },
  {
    label: "Level one 2",
    children: [
      {
        label: "Level two 2-1",
        children: [
          {
            label: "Level three 2-1-1",
          },
        ],
      },
      {
        label: "Level two 2-2",
        children: [
          {
            label: "Level three 2-2-1",
          },
        ],
      },
    ],
  },
  {
    label: "Level one 3",
    children: [
      {
        label: "Level two 3-1",
        children: [
          {
            label: "Level three 3-1-1",
          },
        ],
      },
      {
        label: "Level two 3-2",
        children: [
          {
            label: "Level three 3-2-1",
          },
        ],
      },
    ],
  },
];

const defaultProps = {
  children: "children",
  label: "label",
};
</script>
<template>
  <el-tree :data="data" :props="defaultProps" @node-click="handleNodeClick" />
</template>
