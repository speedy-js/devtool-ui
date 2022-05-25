<script setup lang="ts">
import { computed, onMounted, KeepAlive, Suspense } from "vue";
import Container from "../components/container.vue";
import NavBar from "../components/navbar.vue";
import Graph from "../components/graph.vue";
import ModuleTree from "../components/module-tree.vue";
import ModuleList from "../components/module-list.vue";
import { useRoute, RouterView } from "vue-router";
import { refetch, searchResults, listMode, toggleMode } from "../logic";
import SearchBox from "../components/search-box.vue";
import ListBoxes from "~icons/carbon/list-boxes";
import List from "~icons/carbon/list";
import Network from "~icons/carbon/network4";
import Timer from "~icons/carbon/timer";
import CarbonTree from "~icons/carbon/tree";
import LogoGithub from "~icons/carbon/logo-github";
const route = useRoute();
const isRoot = computed(() => route.path === "/");
onMounted(() => {
  refetch();
});
</script>

<template>
  <NavBar>
    <span class="text-md">Speedy Inspect</span>
    <SearchBox />
    <div class="flex-auto" />
    <router-link class="icon-btn text-lg" to="/plugins-metric">
      <Timer />
    </router-link>
    <button class="icon-btn text-lg" title="View Mode" @click="toggleMode()">
      <ListBoxes v-if="listMode === 'detailed'" />
      <List v-else-if="listMode === 'list'" />
      <CarbonTree v-else-if="listMode === 'tree'" />
      <Network v-else />
    </button>
    <a
      class="icon-btn text-lg"
      href="https://github.com/antfu/vite-plugin-inspect"
      target="_blank"
    >
      <LogoGithub />
    </a>
  </NavBar>
  <Container class="overflow-auto">
    <KeepAlive>
      <Graph v-if="listMode === 'graph'" :modules="searchResults" />
      <ModuleTree v-else-if="listMode === 'tree'" :modules="searchResults" />
      <ModuleList v-else :modules="searchResults" />
    </KeepAlive>
  </Container>
  <div
    class="fixed left-0 top-0 right-0 bottom-0 transition-all flex overflow-hidden bg-black/50"
    :class="isRoot ? 'pointer-events-none opacity-0' : 'opacity-100'"
  >
    <router-link class="min-w-70px h-full flex-auto" to="/" />
    <div
      class="bg-white dark:bg-[#111] border-main border-l h-full overflow-hidden shadow-lg transition-transform transform duration-300 w-4/5"
      :class="isRoot ? 'translate-x-1/2' : 'translate-x-0'"
    >
      <Suspense>
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
        <template #fallback>
          Loading...
        </template>
      </Suspense>
    </div>
  </div>
</template>
