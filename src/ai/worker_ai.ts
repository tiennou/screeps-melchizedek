import { AIAction, AIManager, AIManagerID, CreepRole } from "./types";
import { errorForCode } from "utilities/utils";
import { Colony } from "colony/colony";
import { log } from "console/log";

const MAX_STANDBY_DURATION = 10;

export const WorkerAI = new (class WorkerAI implements AIManager {
  public getID() {
    return "worker" as AIManagerID;
  }

  public getRoles() {
    return [CreepRole.HARVESTER, CreepRole.UPGRADER, CreepRole.BUILDER, CreepRole.RECLAIMER];
  }

  public getMemoryForRole(colony: Colony, pers: CreepRole): BaseCreepMemory {
    return { manager: this.getID(), role: pers, colony: colony.id };
  }

  private log(creep: Creep, ...msg: any[]) {
    log.debugCreep(creep, msg);
  }

  public schedule(creeps: Creep[]) {
    for (const creep of creeps) {
      // this.log(creep, `checking scheduling ${creep.role}: ${creep.action} at ${creep.target?.pos}`);

      if (
        (creep.role === CreepRole.HARVESTER || creep.role === CreepRole.UPGRADER || creep.role === CreepRole.BUILDER) &&
        // || (creep.role === CreepRole.RECLAIMER && creep.action !== "reclaim")
        ((creep.action !== "harvest" && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) ||
          (creep.action === "harvest" && !creep.target))
      ) {
        this._scheduleHarvest(creep);
      } else if (
        (creep.role === CreepRole.HARVESTER || creep.role === CreepRole.RECLAIMER) &&
        ((creep.store.getFreeCapacity() <= 0 && creep.action !== "dropoff") ||
          (creep.action === "dropoff" && !creep.target))
      ) {
        this._scheduleDropoff(creep);
      } else if (
        creep.role === CreepRole.UPGRADER &&
        creep.action !== "upgrade" &&
        creep.store.getFreeCapacity() <= 0
      ) {
        this._scheduleUpgrade(creep);
      } else if (
        creep.role === CreepRole.BUILDER &&
        ((creep.store.getFreeCapacity() === 0 && creep.action !== "repair" && creep.action !== "build") ||
          (creep.action === "repair" && !creep.target))
      ) {
        this._scheduleRepair(creep);
      } else if (
        creep.role === CreepRole.BUILDER &&
        ((creep.store.getFreeCapacity() === 0 && creep.action !== "repair" && creep.action !== "build") ||
          (creep.action === "build" && !creep.target))
      ) {
        this._scheduleBuild(creep);
      } else if (
        creep.role === CreepRole.RECLAIMER &&
        ((creep.store.getFreeCapacity() > 0 && creep.action !== "reclaim") ||
          (creep.action === "reclaim" && !creep.target))
      ) {
        this._scheduleReclaim(creep);
      } else if (
        creep.action === "standby" &&
        (!creep.memory.lastActionTime || Game.time - creep.memory.lastActionTime >= MAX_STANDBY_DURATION)
      ) {
        this._scheduleStandby(creep);
      } else {
        // this.log(creep, `fall-through in schedule!`);
      }
    }
  }

  private _scheduleHarvest(creep: Creep) {
    const candidate = this._findClosestUncrowdedSource(creep);
    if (!candidate) {
      creep.say("❓ source");
      creep.performAction("standby");
      return;
    }

    this.log(creep, `empty, heading off to ${String(candidate.pos)}`);

    creep.say("🔄 harvest");
    creep.performAction("harvest", candidate);
  }

  private _findClosestUncrowdedSource(creep: Creep) {
    return creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE, {
      filter(source) {
        return source.freeSpaceCount - source.harvesters.length > 0;
      },
    });
  }

  private _scheduleDropoff(creep: Creep) {
    const candidate = this._findClosestEnergyDropoffPoint(creep);

    if (!candidate) {
      creep.say("❓ storage");
      creep.performAction("upgrade", creep.room.controller);
      return;
    }

    this.log(creep, `full, heading off to ${String(candidate.pos)}`);

    creep.say("🚚 dropoff");
    creep.performAction("dropoff", candidate);
  }

  private _findClosestEnergyDropoffPoint(creep: Creep) {
    return (
      creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: struct => {
          return (
            (struct.structureType === STRUCTURE_EXTENSION ||
              struct.structureType === STRUCTURE_SPAWN ||
              struct.structureType === STRUCTURE_TOWER) &&
            struct.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        },
      }) ?? undefined
    );
  }

  private _scheduleUpgrade(creep: Creep) {
    if (!creep.room.controller) {
      creep.say("❓ ctrl");
      creep.performAction("standby");
      return;
    }
    const candidate = creep.room.controller;

    this.log(creep, `full, heading off to ${String(candidate.pos)}`);

    creep.say("🚧 upgrade");
    creep.performAction("upgrade", candidate);
  }

  private _scheduleRepair(creep: Creep) {
    const targets = creep.room
      .find(FIND_STRUCTURES, { filter: struct => struct.hits / struct.hitsMax < 0.8 })
      .sort((a, b) => a.hits / a.hitsMax - b.hits / b.hitsMax);
    const target = targets.shift();
    if (!target) {
      creep.say("🆗 damage");
      creep.performAction("build");
      return;
    }

    this.log(creep, `seeing damaged target ${String(target)} at ${String(target.pos)}`);
    creep.say("🔨repair");
    creep.performAction("repair", target);
  }

  private _scheduleBuild(creep: Creep) {
    const candidate = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
    if (!candidate) {
      creep.say("❓ build");
      creep.performAction("upgrade", creep.room.controller);
      return;
    }

    this.log(creep, `full, heading off to ${String(candidate)} at ${String(candidate.pos)}`);

    creep.say("🚧 build");
    creep.performAction("build", candidate);
  }

  private _scheduleReclaim(creep: Creep) {
    let target: Resource<ResourceConstant> | Tombstone | null = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES);
    if (!target) {
      target = creep.pos.findClosestByPath(FIND_TOMBSTONES);
      if (!target) {
        if (creep.store.getUsedCapacity() > 0) {
          // No more resources, but we're carrying some
          creep.performAction("dropoff", this._findClosestEnergyDropoffPoint(creep));
          return;
        }
      }

      creep.say("❓ drop");
      creep.performAction("standby");
      return;
    }

    this.log(creep, `found resources, going to ${String(target.pos)}`);

    creep.say("💀 reclaim");
    creep.performAction("reclaim", target);
  }

  private _scheduleStandby(creep: Creep) {
    this.log(creep, `inactive for more than ${MAX_STANDBY_DURATION}`);

    const actionsByRole: Record<CreepRole, AIAction> = {
      harvester: "harvest",
      upgrader: "upgrade",
      builder: "build",
      reclaimer: "reclaim",
    };
    const action = actionsByRole[creep.role];
    if (!action) {
      return;
    }

    this.log(creep, `inactive for more than ${MAX_STANDBY_DURATION}, tentatively trying to ${action}`);
    creep.performAction(actionsByRole[creep.role]);
  }

  public run(creeps: Creep[]) {
    for (const creep of creeps) {
      // this.log(creep, `current action ${creep.action} at ${creep.target?.pos}`);

      if (creep.action === "harvest") {
        this._doHarvest(creep);
      } else if (creep.action === "dropoff") {
        this._doDropoff(creep);
      } else if (creep.action === "upgrade") {
        this._doUpgrade(creep);
      } else if (creep.action === "repair") {
        this._doRepair(creep);
      } else if (creep.action === "build") {
        this._doBuild(creep);
      } else if (creep.action === "reclaim") {
        this._doReclaim(creep);
      }
    }
  }

  private _doMove(creep: Creep) {
    const result = creep.moveTo(creep.target as RoomPosition, { visualizePathStyle: { stroke: "#ffaa00" } });
    if (result === OK || result === ERR_TIRED) {
      // All good
    } else if (result === ERR_NO_PATH) {
      this.log(creep, `harvest travel inaccessible, rescheduling`);
      creep.reschedule();
    } else {
      this.log(creep, `harvest travel error: ${errorForCode(result)}`);
    }
  }

  private _doHarvest(creep: Creep) {
    const result = creep.harvest(creep.target as Source);
    if (result === OK || result === ERR_BUSY) {
      // All good
    } else if (result === ERR_NOT_IN_RANGE) {
      this._doMove(creep);
    } else if (result === ERR_NOT_ENOUGH_ENERGY) {
      // Clear target so we reschedule
      this.log(creep, `harvest target depleted, rescheduling`);
      creep.reschedule();
    } else if (result === ERR_INVALID_TARGET) {
      // Clear target so we reschedule
      this.log(creep, `harvest target invalid, rescheduling`);
      creep.reschedule();
    } else {
      this.log(creep, `harvest error: ${errorForCode(result)}`);
    }
  }

  private _doDropoff(creep: Creep) {
    const result = creep.transfer(creep.target as AnyCreep, RESOURCE_ENERGY);
    if (result === OK || result === ERR_BUSY) {
      // All good
    } else if (result === ERR_NOT_IN_RANGE) {
      this._doMove(creep);
    } else if (result === ERR_FULL) {
      // Clear target so we reschedule
      this.log(creep, `transfer target full, rescheduling`);
      creep.reschedule();
    } else {
      this.log(creep, `transfer error: ${errorForCode(result)}`);
    }
  }

  private _doUpgrade(creep: Creep) {
    const result = creep.upgradeController(creep.target as StructureController);
    if (result === OK || result === ERR_BUSY) {
      // All good
    } else if (result === ERR_NOT_IN_RANGE) {
      this._doMove(creep);
    } else {
      this.log(creep, `upgrade error: ${errorForCode(result)}`);
    }
  }

  private _doRepair(creep: Creep) {
    const result = creep.repair(creep.target as Structure<StructureConstant>);
    if (result === OK || result === ERR_BUSY) {
      // All good
    } else if (result === ERR_NOT_IN_RANGE) {
      this._doMove(creep);
    } else if (result === ERR_INVALID_TARGET) {
      // Clear target so we reschedule
      this.log(creep, `repair target invalid, rescheduling`);
      creep.reschedule();
    } else {
      this.log(creep, `repair error: ${errorForCode(result)}`);
    }
  }

  private _doBuild(creep: Creep) {
    const result = creep.build(creep.target as ConstructionSite<BuildableStructureConstant>);
    if (result === OK || result === ERR_BUSY) {
      // All good
    } else if (result === ERR_NOT_IN_RANGE) {
      this._doMove(creep);
    } else if (result === ERR_INVALID_TARGET) {
      // Clear target so we reschedule
      this.log(creep, `build target invalid, rescheduling`);
      creep.reschedule();
    } else {
      this.log(creep, `build error: ${errorForCode(result)}`);
    }
  }

  private _doReclaim(creep: Creep) {
    const result = creep.pickup(creep.target as Resource<ResourceConstant>);
    if (result === OK || result === ERR_BUSY) {
      // All good
    } else if (result === ERR_NOT_IN_RANGE) {
      this._doMove(creep);
    } else if (result === ERR_FULL) {
      this.log(creep, `${creep.name}: reclaming, but full, rescheduling`);
      creep.reschedule();
    } else if (result === ERR_INVALID_TARGET) {
      // Clear target so we reschedule
      this.log(creep, `reclaim target invalid, rescheduling`);
      creep.reschedule();
    } else {
      this.log(creep, `reclaim error: ${errorForCode(result)}`);
    }
  }
})();
