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
const router = useRouter();
import { isDark } from "../logic";

interface Tree {
  label: string;
  children?: Tree[];
}

function toTreeData(list: ModuleInfo[], root: string): Tree[] {
  const fileList = list
    .filter((i) => !i.id.includes("//"))
    // @, ~, /@, : http://
    // .filter((i) => i.id.startsWith("/"))
    .map((i) => ({
      ...i,
      _p: i.id.replace(root, ""),
    }))

    .sort((a, b) => a._p.localeCompare(b._p));
  const urlList = list
    .map((i) => {
      if (i.id.includes("//")) {
        try {
          const { host } = new URL(i.id);
          return { ...i, host };
        } catch (_) {
          return null;
        }
      }
      return null;
    })
    .filter((i) => !!i)
    .sort((a, b) => a!.id.localeCompare?.(b!.id));

  const data: Tree[] = [];
  const addItem = (path: string[], value: string, item: any) => {
    let curIndex = 0;
    let father = data;
    let curItem = father.find((i) => i.label === path[curIndex]);
    while (curIndex < path.length) {
      if (!curItem) {
        curItem = { label: path[curIndex], children: [] };
        father.push(curItem);
      }
      curIndex++;
      father = curItem.children!;
      if (!Array.isArray(father)) {
        return;
      }
      curItem = father.find((i) => i.label === path[curIndex]);
    }
    const name = value.split("?")[0];
    if (Array.isArray(father) && !father.find((i) => i.label === name)) {
      father.push({ label: name, children: [], item });
    }
  };
  for (const i of fileList) {
    const pathList = i._p.split("/");
    const name = pathList.pop();
    if (name) addItem(pathList.slice(1), name, i);
  }

  for (const i of urlList) {
    const u = new URL(i.id);
    const { host } = u;
    let item = data.find((i) => i.label === host);
    if (!item) {
      item = {
        label: host,
        children: [],
      };
      data.push(item);
    }
    item?.children?.push({ label: i.id, item: i });
  }
  return data;
}
const treeData = computed(() => {
  const d = toTreeData(props.modules ?? [], root.value);
  return d;
});

const handleNodeClick = (data: Tree) => {
  if (!data.children?.length) {
    router.push(`/module?id=${encodeURIComponent(data?.item?.id)}`);
  }
};

const defaultProps = {
  children: "children",
  label: "label",
};
</script>
<template>
  <el-tree
    className="bg-white dark:bg-[#111] dark-font-white"
    :data="treeData"
    :props="defaultProps"
    @node-click="handleNodeClick"
  />
</template>
