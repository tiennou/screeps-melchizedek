// import { AIManagerID } from "ai/types";

// Memory extension samples
// interface Memory {
//   uuid: number;
//   log: any;
// }

interface BaseCreepMemory {
  manager: import("../ai/types").AIManagerID;
  role: import("../ai/types").CreepRole;
  colony?: Id<import("../colony/colony").Colony>;
}

interface WorkerMemory {
  action: import("../ai/types").AIAction;
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

interface RoomMemory {
  sourceIds: Id<Source>[];
}

interface SourceMemory {
  freeSpaceCount: number;
}

interface Memory {
  sources: Record<Id<Source>, SourceMemory>;
}
