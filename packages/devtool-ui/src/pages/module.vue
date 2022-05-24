<script setup lang="ts">
import { Ref, computed, watch } from "vue";
import { useRouteQuery } from "@vueuse/router";
import { msToTime } from "../logic/utils";
import { onRefetch, enableDiff, lineWrapping } from "../logic";
import NavBar from "../components/navbar.vue";
import Container from "../components/container.vue";
import Badge from "../components/badge.vue";
import { useRoute } from "vue-router";
import { useFetch } from "@vueuse/core";
import DiffEditor from "../components/diff-editor.vue";
import CarbonArrowLeft from "~icons/carbon/arrow-left";
import CarbonCompare from "~icons/carbon/compare";
import CarbonTextWrap from "~icons/carbon/text-wrap";
import ModuleId from "../components/module-id.vue";
import PluginName from "../components/plugin-name.vue";
const route = useRoute();
const id = computed(() => route?.query.id as string);

const { data, execute } = useFetch(
  computed(() => `/__inspect_api/module?id=${encodeURIComponent(id.value)}`),
  { immediate: false }
)
  .get()
  .json<{
    resolvedId: string;
    transforms: { name: string; end: number; start: number; result: string }[];
  }>();

const index = useRouteQuery("index") as Ref<string>;
const currentIndex = computed(
  () => +index.value ?? (data.value?.transforms.length || 1) - 1 ?? 0
);

async function refetch() {
  const { id: resolved } = await fetch(
    `/__inspect_api/resolve?id=${encodeURIComponent(id.value)}`
  ).then((r) => r.json());
  // if (resolved) {
  //   // // revaluate the module (if it's not initialized by the module graph)
  //   // try {
  //   //   await fetch(resolved);
  //   // } catch (e) {}
  // }
  await execute();
}

onRefetch.on(async () => {
  await fetch(`/__inspect_api/clear?id=${id.value}`);
  await refetch();
});

watch(id, () => refetch(), { immediate: true });

const from = computed(
  () => data.value?.transforms[currentIndex.value - 1]?.result || ""
);
const to = computed(
  () => data.value?.transforms[currentIndex.value]?.result || ""
);
</script>

<template>
  <NavBar>
    <router-link class="icon-btn !outline-none my-auto" to="/">
      <CarbonArrowLeft />
    </router-link>
    <ModuleId v-if="id" :id="id" />
    <div class="flex-auto" />
    <button
      class="icon-btn text-lg"
      title="Line Wrapping"
      @click="lineWrapping = !lineWrapping"
    >
      <CarbonTextWrap :class="lineWrapping ? 'opacity-100' : 'opacity-25'" />
    </button>
    <button
      class="icon-btn text-lg"
      title="Toggle Diff"
      @click="enableDiff = !enableDiff"
    >
      <CarbonCompare :class="enableDiff ? 'opacity-100' : 'opacity-25'" />
    </button>
  </NavBar>
  <Container
    v-if="data && data.transforms"
    class="grid grid-cols-[500px_3fr] overflow-hidden"
  >
    <div class="flex flex-col border-r border-main overflow-auto">
      <div
        class="border-b border-main px-3 py-2 text-center text-sm tracking-widest text-gray-400"
      >
        TRANSFORM STACK
      </div>
      <template v-for="(tr, idx) of data.transforms" :key="tr.name">
        <button
          class="block border-b border-main px-3 py-2 text-left font-mono text-sm !outline-none"
          :class="currentIndex === idx ? 'bg-main bg-opacity-10' : ''"
          @click="index = idx.toString()"
        >
          <span :class="currentIndex === idx ? 'font-bold' : ''">
            <PluginName :name="tr.name" />
          </span>
          <span class="ml-2 text-xs opacity-50">{{
            msToTime(tr.end - tr.start)
          }}</span>
          <Badge
            v-if="tr.result === data.transforms[idx - 1]?.result"
            class="bg-gray-400/10 text-gray-400"
            v-text="'no change'"
          />
          <Badge
            v-if="idx === 0"
            class="bg-light-blue-400/10 text-light-blue-400"
            v-text="'load'"
          />
          <Badge
            v-if="tr.hook"
            class="bg-orange-400/10 text-orange-400"
            v-text="tr.hook"
          />
        </button>
      </template>
    </div>
    <DiffEditor :from="from.toString()" :to="to.toString()" />
  </Container>
</template>
