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

interface Creep {
  manager: import("../ai/types").AIManagerID;
  colony: import("../colony/colony").Colony;
  role: import("../ai/types").CreepRole;
  action: import("../ai/types").AIAction | undefined;
  target: AnyTarget | undefined;
  reschedule(): void;
  performAction(action: import("../ai/types").AIAction, target?: AnyTarget): void;
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
