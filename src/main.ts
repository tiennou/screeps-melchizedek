import { AIAction, AIManagerID, CreepRole } from "ai/types";
import { AI } from "ai/manager";
import { ColonyManager } from "colony/colony";
import { ErrorMapper } from "utils/ErrorMapper";
import profiler from "screeps-profiler";

// eslint-disable-next-line sort-imports
import "prototypes/prototypes";

declare global {
  /*
    Example types, expand on these or remove them and add your own.
    Note: Values, properties defined here do no fully *exist* by this type definiton alone.
          You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

    Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
    Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
  */
  // Memory extension samples
  interface Memory {
    uuid: number;
    log: any;
  }

  interface BaseCreepMemory {
    manager: AIManagerID;
    role: CreepRole;
    colony?: Id<ColonyManager>;
  }

  interface WorkerMemory {
    action: AIAction;
    target?: Id<any> | RoomPosition;
    lastActionTime: number;
  }

  interface CreepMemory extends BaseCreepMemory, Partial<WorkerMemory> {}

  type AnyTarget =
    // RoomPosition | { pos: RoomPosition } | { id: Id<any> };
    | AnyStructure
    | AnyOwnedStructure
    | ConstructionSite<BuildableStructureConstant>
    | AnyCreep
    | Source
    | Resource<ResourceConstant>
    | RoomPosition;

  interface Creep {
    manager: AIManagerID;
    role: CreepRole;
    action: AIAction | undefined;
    target: AnyTarget | undefined;
    reschedule(): void;
    performAction(action: AIAction, target?: AnyTarget): void;
  }

  interface RoomMemory {
    sourceIds: Id<Source>[];
  }

  interface Room {
    sources: Source[];
    structures: Structure<StructureConstant>[];
    constructionSites: ConstructionSite<BuildableStructureConstant>[];

    // Private
    _sources: Source[];
    _structures: Structure<StructureConstant>[];
    _constructionSites: ConstructionSite<BuildableStructureConstant>[];
  }

  interface SourceMemory {
    freeSpaceCount: number;
  }

  interface Memory {
    sources: Record<Id<Source>, SourceMemory>;
  }

  interface Source {
    memory: SourceMemory;

    freeSpaceCount: number;
    harvesters: Creep[];

    // Private
    _freeSpaceCount: number;
    _harvesters: Creep[];
  }

  // Syntax for adding proprties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
  interface Game {
    myRooms: Room[];
  }
}

profiler.enable();

function main() {
  console.log(`Current game tick is ${Game.time}`);

  ColonyManager.load();

  for (const colony of ColonyManager.colonies()) {
    console.log(`processing colony ${colony.id}`);
    colony.planBuildings();
    colony.manageCreeps();
  }

  AI.schedule();

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(profiler.wrap(main));
