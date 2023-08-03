import { log } from "console/log";

export function tryCatch(func: () => void) {
  try {
    func();
  } catch (error) {
    if (error instanceof Error) {
      log.throw(error);
    } else {
      log.alert(error);
    }
  }
}
