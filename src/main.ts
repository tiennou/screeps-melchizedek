import { AI } from "ai/ai";
import { Colony } from "colony/colony";
import { ErrorMapper } from "utilities/ErrorMapper";
import { log } from "console/log";
import { USE_SCREEPS_PROFILER } from "settings";
import profiler from "screeps-profiler";

// eslint-disable-next-line sort-imports
import "prototypes/prototypes";

if (USE_SCREEPS_PROFILER) {
  profiler.enable();
}

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
