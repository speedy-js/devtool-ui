import App from "./app.vue";
import Home from "./pages/index.vue";
import Module from "./pages/module.vue";
import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import "virtual:windi.css";
import PluginsMetric from "./pages/index/plugins-metric.vue";
// import "virtual:windi-utilities.css";
import "./styles/main.css";
import "./styles/cm.css";

const app = createApp(App as any);
const router = createRouter({
  history: createWebHashHistory("/"),
  routes: [
    {
      path: "/",
      component: Home as any,
      children: [
        { path: "module", component: Module as any},
        { path: "plugins-metric", component: PluginsMetric as any},
      ],
    },
  ],
});
app.use(router);
app.mount("#root");
