import App from "./app.vue";
import Home from "./pages/index.vue";
import Module from "./pages/module.vue";
import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import "virtual:windi.css";
// import "virtual:windi-utilities.css";
import "./styles/main.css";
const app = createApp(App as any);
const router = createRouter({
  history: createWebHashHistory("/"),
  routes: [
    { path: "/", component: Home as any },
    { path: "/module", component: Module },
  ],
});
app.use(router);
app.mount("#root");
