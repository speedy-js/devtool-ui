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
    <label class="flex">
      <input v-model="includeNodeModules" type="checkbox" class="my-auto" />
      <div class="ml-1">node_modules</div>
    </label>
    <label class="flex">
      <input v-model="includeVirtual" type="checkbox" class="my-auto" />
      <div class="ml-1">virtual</div>
    </label>
    <label class="flex center" v-show="listMode === 'graph'">
      <input type="radio" id="import" :value="true" v-model="graphMode" class="my-auto mx-3"/>
      <label for="import">import</label>

      <input type="radio" id="export" :value="false" v-model="graphMode" class="my-auto mx-3" />
      <label for="export">export</label>

      <!-- <input v-model="graphMode" type="checkbox" class="my-auto" />
      <div class="ml-1">{{ !graphMode ? "import" : "export" }}</div> -->
    </label>
  </div>
</template>
