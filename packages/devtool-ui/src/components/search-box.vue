<script setup lang="ts">
import {
  includeNodeModules,
  includeVirtual,
  searchText,
  listMode,
  graphMode,
} from "../logic";
</script>

<template>
  <input
    v-model="searchText"
    type="text"
    class="border border-main px-3 py-1 rounded bg-transparent !outline-none"
    placeholder="Search..."
  />
  <div class="text-xs flex flex-col h-min">
    <div class="flex">
      <input
        v-model="includeNodeModules"
        id="includeNodeModules"
        type="checkbox"
        class="my-auto"
      />
      <label for="includeNodeModules" class="ml-1">node_modules</label>
    </div>
    <div class="flex">
      <input
        id="includeVirtual"
        v-model="includeVirtual"
        type="checkbox"
        class="my-auto"
      />
      <label for="includeVirtual" class="ml-1">virtual</label>
    </div>
    <div class="flex" v-show="listMode === 'graph'">
      <input
        type="radio"
        id="import"
        :value="false"
        v-model="graphMode"
        class="my-auto"
      />
      <label for="import" class="ml-1 my-auto">import</label>

      <input
        type="radio"
        id="export"
        :value="true"
        v-model="graphMode"
        class="ml-1 my-auto"
      />
      <label for="export" class="ml-1 my-auto">export</label>
    </div>
  </div>
</template>
