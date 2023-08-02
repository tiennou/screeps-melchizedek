interface Creep {
  manager: import("../ai/types").AIManagerID;
  colony: import("../colony/colony").Colony;
  role: import("../ai/types").CreepRole;
  action: import("../ai/types").AIAction | undefined;
  target: AnyTarget | undefined;
  reschedule(): void;
  performAction(action: import("../ai/types").AIAction, target?: AnyTarget): void;
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

interface Source {
  memory: SourceMemory;

  freeSpaceCount: number;
  harvesters: Creep[];

  // Private
  _freeSpaceCount: number;
  _harvesters: Creep[];
}

interface RoomPosition {
  print: string;
}
