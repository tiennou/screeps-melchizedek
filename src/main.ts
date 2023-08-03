import { AI } from "ai/ai";
import { Colony } from "colony/colony";
import { ErrorMapper } from "utilities/ErrorMapper";
import { log } from "console/log";
import profiler from "screeps-profiler";

import { USE_SCREEPS_PROFILER } from "settings";

// eslint-disable-next-line sort-imports
import "prototypes/prototypes";
import { tryCatch } from "utilities/tryCatch";

function onReset() {
  log.warning("resetting…");
  if (USE_SCREEPS_PROFILER) {
    log.warning("🔍 Profiling enabled");
    profiler.enable();
  }

  global.Colony = Colony;
  global.Log = log;
}

onReset();

function main() {
  const cpuUsage = Game.cpu.getUsed();
  log.debug(`main loop start`);

  tryCatch(() => {
    Colony.load();

    for (const colony of Colony.colonies()) {
      log.info(`processing colony ${colony.id}`);
      colony.schedule();
    }

    AI.schedule();
  });

  log.debug(`main loop done: ${Game.cpu.getUsed() - cpuUsage}`);

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }
}

export const loop = ErrorMapper.wrapLoop(profiler.wrap(() => main));
