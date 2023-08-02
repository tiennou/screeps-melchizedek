import { USE_SCREEPS_PROFILER } from "settings";
import profiler from "screeps-profiler";

// eslint-disable-next-line
type AnyFunction = Function;

export function profile(target: AnyFunction): void;
export function profile(target: object, key: string | symbol, _descriptor: TypedPropertyDescriptor<AnyFunction>): void;
export function profile(
  target: object | AnyFunction,
  key?: string | symbol,
  _descriptor?: TypedPropertyDescriptor<AnyFunction>
): void {
  if (!USE_SCREEPS_PROFILER) {
    return;
  }

  if (key) {
    // case of method decorator
    profiler.registerFN(target as AnyFunction, key as string);
    return;
  }

  // case of class decorator
  const ctor = target as { prototype: object; name: string };
  if (!ctor.prototype) {
    return;
  }

  const className = ctor.name;
  profiler.registerClass(target, className);
}
