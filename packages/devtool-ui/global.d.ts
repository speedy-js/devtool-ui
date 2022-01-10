declare module "*.vue" {
  import Vue from "vue";
  export default Vue;
}

declare module "*?worker" {
  const a: new () => Worker;
  export default a;
}

declare module "~icons/*" {
  import Vue from "vue";
  export default Vue;
}