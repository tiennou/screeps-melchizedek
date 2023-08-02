declare module "screeps-profiler" {
  function wrap<T extends CallableFunction>(cb: T): T;
  function enable(): void;
  function output(limit: number): string[];
  function registerObject(object: any, label: string): void;
  function registerFN(func: CallableFunction, funcName: string): void;
  function registerClass(object: any, label: string): void;
}
