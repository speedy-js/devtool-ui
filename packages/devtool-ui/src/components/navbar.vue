<script setup lang="ts">
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
  <nav class="font-light px-6 border-b border-main flex gap-4 h-54px children:my-auto">
    <slot />
    <button class="icon-btn text-lg" title="Refetch" @click="refetch()">
      <Renew />
    </button>
    <button class="icon-btn text-lg" title="Toggle Dark Mode" @click="toggleDark()">
      <Moon v-if="isDark" />
      <Sun v-else />
    </button>
  </nav>
</template>
