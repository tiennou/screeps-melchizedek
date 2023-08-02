import { AI } from "ai/manager";
import { Colony } from "colony/colony";
import { ErrorMapper } from "utils/ErrorMapper";
import profiler from "screeps-profiler";

// eslint-disable-next-line sort-imports
import "prototypes/prototypes";

// profiler.enable();

function main() {
  console.log(`Current game tick is ${Game.time}`);

  Colony.load();

  global.Colony = Colony;

  for (const colony of Colony.colonies()) {
    console.log(`processing colony ${colony.id}`);
    colony.schedule();
  }

  AI.schedule();

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }
}

export const loop = ErrorMapper.wrapLoop(profiler.wrap(() => main));
