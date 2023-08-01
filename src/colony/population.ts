import { AIManager, CreepRole } from "ai/types";
import { errorForCode, getCreeps } from "utils";
import { AI } from "../ai/manager";

const creepChassis: Record<string, BodyPartConstant[][]> = {
  worker: [
    [WORK, CARRY, MOVE],
    [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
    [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
  ],
  fighter: [],
};

function getBestBodyForCreepRole(room: Room, manager: AIManager, role: CreepRole): BodyPartConstant[] | undefined {
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
        cost: estimateCreepBodyCost(chassis),
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

function countCreepsUsingSource(room: Room, exceptRole: CreepRole) {
  const rolesUsingSource = [CreepRole.HARVESTER, CreepRole.UPGRADER, CreepRole.BUILDER].filter(f => f !== exceptRole);
  return _.filter(Game.creeps, creep => creep.room.name === room.name && rolesUsingSource.includes(creep.memory.role))
    .length;
}

function getOptimalPopCount(room: Room, role: CreepRole) {
  switch (role) {
    case CreepRole.HARVESTER: {
      const totalSourceSlots = room.sources.map(s => s.freeSpaceCount).reduce((sum, value) => (sum += value));

      const min = room.sources.length;
      const max = totalSourceSlots - countCreepsUsingSource(room, role);
      return [min, max];
    }

    case CreepRole.UPGRADER: {
      const totalSourceSlots = room.sources.map(s => s.freeSpaceCount).reduce((sum, value) => (sum += value));

      const min = 2;
      const max = totalSourceSlots - countCreepsUsingSource(room, role);
      return [min, max];
    }

    case CreepRole.BUILDER: {
      const totalSourceSlots = room.sources.map(s => s.freeSpaceCount).reduce((sum, value) => (sum += value));
      const maxSourceSlots = totalSourceSlots - countCreepsUsingSource(room, role);

      const buildingCount = room.constructionSites.length;

      // Try to always have 2 builder handy, with one per construction site
      const min = Math.min(Math.max(2, Math.ceil(buildingCount / 1.5)), maxSourceSlots);
      // Cap the max count to the minimum of builders needed, or 2
      const max = Math.max(min, 2);

      return [min, max];
    }

    case CreepRole.RECLAIMER: {
      const drops = room.find(FIND_DROPPED_RESOURCES);
      const min = drops.length > 0 ? 1 : 0;
      return [min, 1];
    }

    default:
      return [-1, -1];
  }
}

function tryAndSpawnCreep(spawn: StructureSpawn, role: CreepRole) {
  if (spawn.spawning) return;

  // Get the data for spawning a new creep for role
  const manager = AI.getManagerForRole(role);
  if (!manager) return;

  const body = getBestBodyForCreepRole(spawn.room, manager, role);
  if (!body) return;

  const memory = manager.getMemoryForRole(role);
  const creepCost = estimateCreepBodyCost(body);
  if (spawn.room.energyAvailable < creepCost) {
    console.log(`insufficient energy available: ${spawn.room.energyAvailable}, ${creepCost} needed`);
    return;
  }

  console.log(`about to spawn a ${role}, ${creepCost}, ${JSON.stringify(memory)}`);

  const result = spawn.spawnCreep(body, role + Game.time, { memory });
  if (result !== OK) {
    console.log(`Failed to spawn ${role} in ${spawn.room.name}: ${errorForCode(result)}`);
    return result;
  }
  console.log(`Spawning ${role} in ${spawn.room.name}…`);
  return result;
}

interface PopulationStats {
  role: CreepRole;
  min: number;
  max: number;
  subtotal: number;
  total: number;
  delta: number;
}

/**
 * @param {Room} room
 * @returns {PopulationStats[]}
 */
function getCreepPopulation(room: Room) {
  const stats: PopulationStats[] = [];
  for (const manager of AI.getManagers()) {
    const creeps = getCreeps(room, manager.getID());
    for (const role of manager.getRoles()) {
      const subtotal = creeps.map(c => c.role).filter(p => p === role).length;

      const [min, max] = getOptimalPopCount(room, role);

      const delta = min !== -1 ? subtotal - min : subtotal;

      stats.push({ role, min, max, subtotal, total: creeps.length, delta });
    }
  }
  return stats;
}

export function manageCreeps(room: Room) {
  if (Game.time % 10 !== 0) return;

  // find the spawn in the room
  const spawns = room.find(FIND_MY_SPAWNS);
  if (!spawns) return;
  const spawn = spawns[0];

  // console.log(`managing creep population in ${room}`);
  const creepPop = getCreepPopulation(room);

  console.log(`Room "${room.name}" population stats:`);
  for (const pop of creepPop) {
    console.log(
      `\t${pop.role}: ${pop.subtotal}/${pop.total}, should optimally be in [${pop.min}...${pop.max}], delta: ${pop.delta}`
    );
  }
  console.log();

  // We're already spawning something
  if (spawn.spawning) {
    console.log(`\t• spawning in progress, ${spawn.spawning.remainingTime} ticks left`);
  }

  const popSortedByDelta = creepPop.sort((a, b) => a.delta - b.delta);

  const energyRatio = room.energyAvailable / room.energyCapacityAvailable;

  let shouldSpawn;
  let growPop;
  while ((growPop = popSortedByDelta.shift())) {
    if (growPop.delta < 0) {
      // We need that pop real bad
      console.log(`\t• ${growPop.role} pop needs to grow`);
      shouldSpawn = growPop.role;
      break;
    } else if (
      growPop.delta >= 0 &&
      (growPop.max === -1 || growPop.delta + (growPop.min !== -1 ? growPop.min : 0) < growPop.max)
    ) {
      // We already are over the minimum cap, make sure we don't go over the max
      if (energyRatio > 0.8) {
        console.log(`\t• ${growPop.role} pop should grow`);
        shouldSpawn = growPop.role;
        break;
      } else {
        console.log(`\t• ${growPop.role} pop should grow, but insufficent energy`);
        break;
      }
    }
  }

  if (!growPop) {
    console.log(`\t• Room cannot grow anymore`);
    return;
  }
  console.log();

  if (shouldSpawn) {
    tryAndSpawnCreep(spawn, shouldSpawn);
  }
}

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

function estimateCreepBodyCost(bodyParts: BodyPartConstant[]) {
  return bodyParts.map(part => bodyPartCosts[part]).reduce((sum, value) => sum + value, 0);
}
