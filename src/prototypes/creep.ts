import { AIAction } from "ai/types";
import { Colony } from "colony/colony";
import { log } from "console/log";

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
  get(this: Creep): Colony | undefined {
    const id = this.memory.colony;
    if (!id) return undefined;
    return [...Colony.colonies()].find(c => c.id === id);
  },
  set(colony: Colony) {
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
    log.debugCreep(this, `performing action: ${action}, target: ${String(target)}`);

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
      log.debugCreep(this, `cannot work with ${String(target)}`);
    }
  }
};
