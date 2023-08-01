import { manageCreeps } from "colony/population";
import { scheduleBuildings } from "./building";

export interface ColonyData {
  id: Id<ColonyManager>;
  controllers: Id<StructureController>[];
}

declare global {
  interface Memory {
    colonies: Record<Id<ColonyManager>, ColonyData>;
  }
}

export class ColonyManager {
  private static _colonies = new Map<Id<ColonyManager>, ColonyManager>();

  public static create(controller: StructureController) {
    const id = controller.id as unknown as Id<ColonyManager>;
    const manager = new this(id, [controller]);

    this._colonies.set(id, manager);
  }

  public static colonies() {
    return [...this._colonies.values()];
  }

  public static load(): void {
    if (!_.isObject(Memory.colonies)) {
      console.log("creating colony");
      const rooms = _.filter(Game.rooms, r => r.controller && r.controller.level > 0 && r.controller.my);
      const controllers = rooms.map(r => r.controller);
      for (const controller of controllers) {
        if (controller) ColonyManager.create(controller);
      }
    } else {
      // console.log("reloading colonies");
      for (const [colonyID, data] of Object.entries(Memory.colonies) as unknown as [Id<ColonyManager>, ColonyData][]) {
        if (this._colonies.get(colonyID)) {
          continue;
        }

        const controllers: StructureController[] = [];
        for (const controllerID of data.controllers) {
          const c = Game.getObjectById<ColonyManager>(controllerID);
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

  public id: Id<ColonyManager>;
  private _controllers: StructureController[];

  private constructor(id: Id<ColonyManager>, controllers: StructureController[]) {
    this.id = id;
    this._controllers = controllers;
    this.serialize();
  }

  private serialize() {
    const id = this._controllers[0].id as unknown as Id<ColonyManager>;
    const data: ColonyData = {
      id,
      controllers: this._controllers.map(c => c.id),
    };
    if (!_.isObject(Memory.colonies)) Memory.colonies = {};
    Memory.colonies[id] = data;
  }

  public planBuildings(): void {
    const rooms = this._controllers.map(c => c.room);
    for (const room of rooms) {
      console.log(`planning buildings in ${String(room)}`);
      // scheduleBuildings(room);
    }
  }

  public manageCreeps() {
    const rooms = this._controllers.map(c => c.room);
    for (const room of rooms) {
      console.log(`managing creeps in ${String(room)}`);
      manageCreeps(room);
    }
  }
}
