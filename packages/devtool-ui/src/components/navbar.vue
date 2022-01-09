<script setup lang="ts">
import LogoGithub from "~icons/carbon/logo-github";
import CarbonArrowLeft from "~icons/carbon/arrow-left";
import CarbonTextWrap from "~icons/carbon/text-wrap";
import CarbonCompare from "~icons/carbon/compare";
import CarbonListBoxes from "~icons/carbon/list-boxes";
import CarbonList from "~icons/carbon/list";
import Network from "~icons/carbon/network4";
import Renew from "~icons/carbon/renew";
import Moon from "~icons/carbon/moon";
import Sun from "~icons/carbon/sun";
import {
  isDark,
  toggleDark,
  enableDiff,
  lineWrapping,
  refetch,
  toggleMode,
  listMode,
} from "../logic";

defineProps<{
  id?: string;
}>();
</script>

<template>
  <nav
    class="font-light px-6 border-b border-main flex gap-4 h-54px children:my-auto"
  >
    <template v-if="$route.path != '/'">
      <router-link
        v-if="$route.path != '/'"
        class="icon-btn !outline-none my-auto"
        to="/"
      >
        <CarbonArrowLeft />
      </router-link>
      <!-- <ModuleId v-if="id" :id="id" /> -->
      <div class="flex-auto"></div>
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
    </template>
    <template v-else>
      <span class="text-md">Speedy Inspect</span>
      <!-- <SearchBox /> -->
      <div class="flex-auto"></div>
      <button class="icon-btn text-lg" title="View Mode" @click="toggleMode()">
        <CarbonListBoxes v-if="listMode === 'detailed'" />
        <CarbonList v-else-if="listMode === 'list'" />
        <Network v-else />
      </button>
      <a
        class="icon-btn text-lg"
        href="https://github.com/speedy-js/devtool-ui"
        target="_blank"
      >
        <LogoGithub />
      </a>
    </template>
    <button class="icon-btn text-lg" title="Refetch" @click="refetch()">
      <Renew />
    </button>
    <button
      class="icon-btn text-lg"
      title="Toggle Dark Mode"
      @click="toggleDark()"
    >
      <Moon v-if="isDark" />
      <Sun v-else />
    </button>
  </nav>
</template>
