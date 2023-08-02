import { AIManager, CreepRole } from "./types";
import { ColonyReturnCode, ERR_NO_AVAILABLE_SPAWNER } from "errors";
import { AI } from "./manager";
import { Colony } from "colony/colony";
import { errorForCode } from "utils";

const creepChassis: Record<string, BodyPartConstant[][]> = {
  worker: [
    [WORK, CARRY, MOVE],
    [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
    [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
  ],
  fighter: [],
};

const bodyPartCosts: Record<BodyPartConstant, number> = {
  move: 50,
  work: 100,
  carry: 50,
  attack: 80,
  ranged_attack: 150,
  tough: 10,
  heal: 250,
  claim: 600,
};

export class Spawner {
  private _colony: Colony;

  public constructor(colony: Colony) {
    this._colony = colony;
  }

  private get colony(): Colony {
    return this._colony;
  }

  public estimateCreepBodyCost(bodyParts: BodyPartConstant[]) {
    return _.sum(bodyParts.map(part => bodyPartCosts[part]));
  }

  public getBestBodyForCreepRole(room: Room, manager: AIManager, role: CreepRole): BodyPartConstant[] | undefined {
    // console.log(`finding best possible chassis for creep ${role}`);

    const body: string = manager.getID();

    const availableChassis = creepChassis[body];
    if (!availableChassis) {
      console.log(`No idea how to make a ${body}`);
      return undefined;
    }
    const chassisSortedByCost = availableChassis
      .map(chassis => {
        return {
          cost: this.estimateCreepBodyCost(chassis),
          body: chassis,
        };
      })
      .sort(({ cost: a_cost }, { cost: b_cost }) => b_cost - a_cost);

    // for (const chassis of bodiesSortedByCost) {
    // 	console.log(`cost: ${chassis[0]}, chassis: ${chassis[1]}`);
    // }

    const bestChassis = chassisSortedByCost.find(chassis => room.energyAvailable >= chassis.cost);
    // console.log(`best: ${bestBody?.[1]}, cost: ${bestBody?.[0]}, energy: ${room.energyAvailable}, cap: ${room.energyCapacityAvailable}`);

    if (!bestChassis) {
      console.log(
        `not enough energy to spawn ${body} for ${role}, required: ${chassisSortedByCost
          .map(chassis => chassis.cost)
          .toString()}, energy: ${room.energyAvailable}, capacity: ${room.energyCapacityAvailable}`
      );
      return;
    }
    return bestChassis.body;
  }

  public tryAndSpawnCreep(role: CreepRole) {
    if (!this.colony.availableSpawns) {
      console.log(`no available spawner in ${this._colony.toString()}`);
      return ERR_NO_AVAILABLE_SPAWNER;
    }

    // Get the data for spawning a new creep for role
    const manager = AI.getManagerForRole(role);
    if (!manager) return;

    let result: ColonyReturnCode = ERR_NO_AVAILABLE_SPAWNER;
    for (const spawn of this.colony.availableSpawns) {
      const body = this.getBestBodyForCreepRole(spawn.room, manager, role);
      if (!body) return;

      const memory = manager.getMemoryForRole(this.colony, role);
      const creepCost = this.estimateCreepBodyCost(body);
      if (spawn.room.energyAvailable < creepCost) {
        console.log(`insufficient energy available: ${spawn.room.energyAvailable}, ${creepCost} needed`);
        return;
      }

      console.log(`about to spawn a ${role}, ${creepCost}, ${JSON.stringify(memory)}`);

      result = spawn.spawnCreep(body, role + Game.time, { memory });
      if (result !== OK) {
        console.log(`Failed to spawn ${role} in ${spawn.room.name}: ${errorForCode(result)}`);
        continue;
      }

      console.log(`Spawning ${role} in ${spawn.room.name}…`);
      return result;
    }

    return result;
  }
}
