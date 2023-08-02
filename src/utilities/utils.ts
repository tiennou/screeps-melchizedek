import { ColonyReturnCode } from "errors";

export function color(str: string, colorspec: string): string {
  return `<font color='${colorspec}'>${str}</font>`;
}

const errorMap: Record<ColonyReturnCode, string> = {
  "0": "OK",
  "-1": "ERR_NOT_OWNER",
  "-2": "ERR_NO_PATH",
  "-3": "ERR_NAME_EXISTS",
  "-4": "ERR_BUSY",
  "-5": "ERR_NOT_FOUND",
  "-6": "ERR_INSUFFICIENT",
  // "-6": "ERR_NOT_ENOUGH_ENERGY",
  // "-6": "ERR_NOT_ENOUGH_EXTENSIONS",
  // "-6": "ERR_NOT_ENOUGH_RESOURCES",
  "-7": "ERR_INVALID_TARGET",
  "-8": "ERR_FULL",
  "-9": "ERR_NOT_IN_RANGE",
  "-10": "ERR_INVALID_ARGS",
  "-11": "ERR_TIRED",
  "-12": "ERR_NO_BODYPART",
  "-14": "ERR_RCL_NOT_ENOUGH",
  "-15": "ERR_GCL_NOT_ENOUGH",
  "-1000": "ERR_NO_AVAILABLE_SPAWNER",
};

export function errorForCode(code: ColonyReturnCode) {
  return errorMap[code] ? `${errorMap[code]} (${code})` : `unknown (${code})`;
}
