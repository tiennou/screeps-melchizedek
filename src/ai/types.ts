export enum AIManagerID {
  WORKER = "worker",
}

export type AIAction = string;

export enum CreepRole {
  HARVESTER = "harvester",
  UPGRADER = "upgrader",
  BUILDER = "builder",
  RECLAIMER = "reclaimer",
}

export interface AIManager {
  getID(): AIManagerID;
  getRoles(): CreepRole[];
  getMemoryForRole(role: CreepRole): BaseCreepMemory;
  schedule(creeps: Creep[]): void;
  run(creeps: Creep[]): void;
}
