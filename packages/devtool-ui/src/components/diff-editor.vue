<script lang="ts" setup>
import { onMounted, toRefs, onUpdated } from "vue";
import * as monaco from "monaco-editor";

self.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    if (label === "json") {
      return "./vs/language/json/json.worker.js";
    }
    if (label === "css" || label === "scss" || label === "less") {
      return "./vs/language/css/css.worker.js";
    }
    if (label === "html" || label === "handlebars" || label === "razor") {
      return "./vs/language/html/html.worker.js";
    }
    if (label === "typescript" || label === "javascript") {
      return "./vs/language/typescript/ts.worker.js";
    }
    return "./vs/editor/editor.worker.js";
  },
};

const props = defineProps<{ from: string; to: string }>();
const { from, to } = toRefs(props);
var diffEditor;
onMounted(() => {
  var originalModel = monaco.editor.createModel(from.value, "text/plain");
  var modifiedModel = monaco.editor.createModel(to.value, "text/plain");

  diffEditor = monaco.editor.createDiffEditor(
    document.getElementById("container")
  );
  diffEditor.setModel({
    original: originalModel,
    modified: modifiedModel,
  });
});

onUpdated(() => {
  var originalModel = monaco.editor.createModel(from.value, "text/plain");
  var modifiedModel = monaco.editor.createModel(to.value, "text/plain");
  diffEditor.setModel({
    original: originalModel,
    modified: modifiedModel,
  });
});

</script>
<template>
  <div id="container"></div>
</template>
