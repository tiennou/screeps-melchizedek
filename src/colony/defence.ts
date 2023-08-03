import { log } from "console/log";
import { Colony, ColonyMemory } from "./colony";

const MAX_TOWER_RANGE = 20;
const MIN_TOWER_RANGE = 5;

const MAX_SCHEDULE_DOWNTIME = 15;

export class Defense {
  private colony: Colony;

  private towers: StructureTower[];

  private downtime = 1;

  public constructor(colony: Colony) {
    this.colony = colony;
    this.towers = this.colony.room.find(FIND_MY_STRUCTURES, {
      filter: struct => struct.structureType === STRUCTURE_TOWER,
    });
    this.downtime = colony.memory.defenceDowntime ?? 1;
  }

  private sortedHostileTargets(tower: StructureTower) {
    const hostileCreeps = tower.pos.findInRange(FIND_HOSTILE_CREEPS, MAX_TOWER_RANGE);
    hostileCreeps.sort((a, b) => tower.pos.getRangeTo(a) - tower.pos.getRangeTo(b));
    return hostileCreeps;
  }

  public watch() {
    log.info(`downtime: ${this.downtime}, ${Game.time % this.downtime !== 0}`);
    if (Game.time % this.downtime !== 0) return;

    let engaging = false;
    for (const tower of this.towers) {
      const hostileCreeps = this.sortedHostileTargets(tower);
      const target = hostileCreeps.shift();
      if (!target) continue;

      log.info(`hostiles in room ${this.colony.room.name}, tower ${String(tower)} is engaging ${String(target)}`);
      tower.attack(target);
      engaging = true;
    }

    if (engaging) {
      log.debug(`hostiles, defending`);
      this.downtime = 1;
    } else {
      log.debug(`no hostiles in ${this.colony.room.name}`);
      this.downtime = Math.min(this.downtime + 1, MAX_SCHEDULE_DOWNTIME);
    }
  }
}
