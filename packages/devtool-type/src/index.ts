export interface TransformInfo {
  name: string;
  result: string;
  start: number;
  end: number;
  hook: string;
}

export interface ModuleInfo {
  id: string;
  plugins: string[];
  deps: string[];
  virtual: boolean;
}

export interface ModulesList {
  root: string;
  modules: ModuleInfo[];
}
