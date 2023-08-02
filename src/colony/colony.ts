import { CreepRole } from "ai/types";
import { Spawner } from "ai/spawner";
import { manageCreeps } from "colony/population";
import { scheduleBuildings } from "./building";

interface ColonyData {
  id: Id<Colony>;
  controllers: Id<StructureController>[];
}

declare global {
  interface Memory {
    colonies: Record<Id<Colony>, ColonyData>;
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
      const manager = new this(id, [controller]);

      this._colonies.set(id, manager);
    }
  }

  public static colonies() {
    return [...this._colonies.values()];
  }

  public static load(): void {
    if (!_.isObject(Memory.colonies)) {
      console.log(`creating colony`);
      this.create();
    } else {
      console.log(`reloading colonies`);
      for (const [colonyID, data] of Object.entries(Memory.colonies) as unknown as [Id<Colony>, ColonyData][]) {
        console.log(`reloading colony ${colonyID}, ${JSON.stringify(data)}`);
        if (this._colonies.get(colonyID)) {
          continue;
        }

        if (!_.isArray(data.controllers)) {
          console.log(`invalid format ${String(data.controllers)}, creating colony`);
          Memory.colonies = {};
          this.create();
          return;
        }

        const controllers: StructureController[] = [];
        console.log("cont:", data.controllers);
        for (const controllerID of data.controllers) {
          const c = Game.getObjectById<Colony>(controllerID);
          if (!c) {
            console.log(`cannot restore controller ${controllerID} into colony`);
            continue;
          }
          if (!(c instanceof StructureController)) {
            console.log(`object id ${controllerID} is not a controller`);
            continue;
          }
          controllers.push(c);
        }

        if (!controllers) {
          console.log(`no controller left when reloading colony ${colonyID}`);
        }

        this._colonies.set(data.id, new this(data.id, controllers));
      }
    }
  }

  public id: Id<Colony>;
  private _controllers: StructureController[];
  private _spawner: Spawner;

  private constructor(id: Id<Colony>, controllers: StructureController[]) {
    this.id = id;
    this._controllers = controllers;
    this._spawner = new Spawner(this);
    this.serialize();
  }

  private serialize() {
    const id = this._controllers[0].id as unknown as Id<Colony>;
    const data: ColonyData = {
      id,
      controllers: this._controllers.map(c => c.id),
    };
    if (!_.isObject(Memory.colonies)) Memory.colonies = {};
    Memory.colonies[id] = data;
  }

  public get controllers(): StructureController[] {
    return this._controllers;
  }

  public get spawner(): Spawner {
    return this._spawner;
  }

  public get rooms(): Room[] {
    return this._controllers.map(c => c.room);
  }

  public get spawns(): StructureSpawn[] {
    return _.flatten(this.rooms.map(r => r.find(FIND_MY_SPAWNS)));
  }

  public get availableSpawns(): StructureSpawn[] {
    return this.spawns.filter(s => !s.spawning);
  }

  public get constructionSites(): ConstructionSite[] {
    return _.flatten(this.rooms.map(r => r.constructionSites));
  }

  public get sources(): Source[] {
    return _.flatten(this.rooms.map(r => r.sources));
  }

  public get creeps(): Creep[] {
    return _.filter(Game.creeps, c => c.colony.id === this.id);
  }

  public schedule(): void {
    const rooms = this._controllers.map(c => c.room);
    for (const room of rooms) {
      console.log(`planning buildings in ${String(room)}`);
      scheduleBuildings(room);
    }

    console.log(`managing creeps in ${String(this)}`);
    try {
      manageCreeps(this);
    } catch (exc) {
      const e = exc as Error;
      console.log(`Exception caught: ${e.message}: ${e.stack}`);
    }
  }

  public tryAndSpawnCreep(role: CreepRole) {
    this.spawner.tryAndSpawnCreep(role);
  }

  public toString(): string {
    return this.id;
  }
}
