import { CreepRole } from "ai/types";
import { Spawner } from "ai/spawner";
import { manageCreeps } from "colony/population";
import { scheduleBuildings } from "./building";
import { log } from "console/log";
import { tryCatch } from "utilities/tryCatch";
import { Defense as Defence } from "./defence";

interface ColonyData {
  id: Id<Colony>;
  controller: Id<StructureController>;
}

export interface ColonyMemory extends ColonyData {
  defenceDowntime: number;
}

declare global {
  interface Memory {
    colonies: Record<Id<Colony>, ColonyMemory>;
  }
}

export class Colony {
  private static _colonies = new Map<Id<Colony>, Colony>();

  public static create() {
    const rooms = _.filter(Game.rooms, r => r.controller && r.controller.level > 0 && r.controller.my);
    const controllers = rooms.map(r => r.controller);
    for (const controller of controllers) {
      if (!controller) continue;

      const id = controller.id as unknown as Id<Colony>;
      const manager = new this(controller);

      this._colonies.set(id, manager);
    }
  }

  public static colonies() {
    return [...this._colonies.values()];
  }

  public static load(): void {
    if (!_.isObject(Memory.colonies)) {
      log.debug(`creating colony`);
      Memory.colonies = {};
      this.create();
    } else {
      log.debug(`reloading colonies`);
      for (const [colonyID, data] of Object.entries(Memory.colonies) as unknown as [Id<Colony>, ColonyData][]) {
        log.debug(`reloading colony ${colonyID}, ${JSON.stringify(data)}`);
        if (this._colonies.get(colonyID)) {
          continue;
        }

        const controller = Game.getObjectById<StructureController>(data.controller);
        if (!controller) {
          log.warning(`cannot restore controller ${data.controller} into colony`);
          continue;
        }
        if (!(controller instanceof StructureController)) {
          log.warning(`object id ${data.controller} is not a controller`);
          continue;
        }

        this._colonies.set(data.id, new this(controller));
      }
    }
  }

  public id: Id<Colony>;
  private _controller: StructureController;
  public room: Room;
  private _spawner: Spawner;
  private _defenceForce: Defence;

  private constructor(controller: StructureController) {
    this._controller = controller;
    this.id = controller.id as unknown as Id<Colony>;
    this.room = controller.room;

    if (!Memory.colonies[this.id]) {
      const data: ColonyData = {
        id: this.id,
        controller: this._controller.id,
      };
      Memory.colonies[this.id] = data as ColonyMemory;
    }

    this._spawner = new Spawner(this);
    this._defenceForce = new Defence(this);
  }

  public get memory(): ColonyMemory {
    return Memory.colonies[this.id];
  }

  public get controller(): StructureController {
    return this._controller;
  }

  public get spawner(): Spawner {
    return this._spawner;
  }

  public get spawns(): StructureSpawn[] {
    return this.room.find(FIND_MY_SPAWNS);
  }

  public get availableSpawns(): StructureSpawn[] {
    return this.spawns.filter(s => !s.spawning);
  }

  public get constructionSites(): ConstructionSite[] {
    return this.room.constructionSites;
  }

  public get sources(): Source[] {
    return this.room.sources;
  }

  public get creeps(): Creep[] {
    return _.filter(Game.creeps, c => c.colony.id === this.id);
  }

  public schedule(): void {
    tryCatch(() => {
      log.info(`defence force is watching`);
      this._defenceForce.watch();
    });

    log.info(`planning buildings in ${String(this.room)}`);
    scheduleBuildings(this.room);

    log.debug(`managing creeps in ${String(this)}`);
    tryCatch(() => {
      // WIP: safety so we reparent creeps
      _.filter(Game.creeps, c => !c.colony).forEach(c => (c.colony = this));
      manageCreeps(this);
    });
  }

  public tryAndSpawnCreep(role: CreepRole) {
    this.spawner.tryAndSpawnCreep(role);
  }

  public toString(): string {
    return this.id;
  }
}
