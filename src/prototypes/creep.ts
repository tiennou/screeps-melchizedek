import { AIAction } from "ai/types";
import { ColonyManager } from "colony/colony";
import { logCreep } from "utils";

Object.defineProperty(Creep.prototype, "manager", {
  get(this: Creep) {
    return this.memory.manager;
  },
  configurable: true,
});

Object.defineProperty(Creep.prototype, "role", {
  get(this: Creep) {
    return this.memory.role;
  },
  configurable: true,
});

Object.defineProperty(Creep.prototype, "action", {
  get(this: Creep): AIAction | undefined {
    return this.memory.action;
  },
  configurable: true,
});

Object.defineProperty(Creep.prototype, "target", {
  get<T extends _HasId>(this: Creep): T | RoomPosition | undefined | null {
    const target = this.memory.target;
    if (!target) return undefined;
    if (target instanceof RoomPosition) return target;
    return Game.getObjectById<T>(target);
  },
  configurable: true,
});

Creep.prototype.reschedule = function () {
  this.memory.target = undefined;
};

Object.defineProperty(Creep.prototype, "colony", {
  get(this: Creep): ColonyManager | undefined {
    const id = this.memory.colony;
    if (!id) return undefined;
    return [...ColonyManager.colonies()].find(c => c.id === id);
  },
  set(colony: ColonyManager) {
    (this as Creep).memory.colony = colony.id;
  },
  configurable: true,
});

/**
 *
 * @param {string} action
 * @param {AnyStructure|RoomPosition} target
 */
Creep.prototype.performAction = function (action: AIAction, target: AnyTarget) {
  if (action !== this.action || target !== this.target) {
    // eslint-disable-next-line
    logCreep(this, `performing action: ${action}, target: ${target}`);

    this.memory.action = action;
    this.memory.lastActionTime = Game.time;
    if (!target) {
      this.memory.target = undefined;
    } else if (target instanceof RoomPosition) {
      this.memory.target = target;
    } else if ("id" in target) {
      this.memory.target = target.id;
      // } else if ("pos" in target) {
      //   this.memory.target = target.pos;
    } else {
      // eslint-disable-next-line
      console.log(`cannot work with ${target}`);
    }
  }
};
