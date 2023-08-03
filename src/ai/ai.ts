import { AIManager, AIManagerID, CreepRole } from "./types";
import { WorkerAI } from "./worker_ai";

export class AI {
  public static getManagers(): AIManager[] {
    return [WorkerAI];
  }

  public static getManagerWithId(id: AIManagerID) {
    return this.getManagers().find(m => m.getID() === id);
  }

  public static getManagerForRole(role: CreepRole) {
    for (const manager of this.getManagers()) {
      if (manager.getRoles().includes(role)) return manager;
    }
    return undefined;
  }

  public static getManagedRoles() {
    const managed = new Map<CreepRole, AIManager>();
    for (const manager of this.getManagers()) {
      for (const persona of manager.getRoles()) {
        managed.set(persona, manager);
      }
    }
    return managed;
  }

  public static schedule() {
    const buckets = new Map<AIManagerID, Creep[]>();
    for (const name in Game.creeps) {
      const creep = Game.creeps[name];
      if (!creep.manager) continue;

      let bucket = buckets.get(creep.manager);
      if (!bucket) {
        bucket = [];
        buckets.set(creep.manager, bucket);
      }
      bucket.push(creep);
    }

    for (const [managerID, creeps] of buckets.entries()) {
      const manager = this.getManagerWithId(managerID);
      if (!manager) continue;

      // if (Game.time % 5 === 0)
      manager.schedule(creeps);
      manager.run(creeps);
    }
  }
}
