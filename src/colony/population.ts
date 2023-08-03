import { AI } from "ai/ai";
import { Colony } from "./colony";
import { CreepRole } from "ai/types";
import { log } from "console/log";

function countCreepsUsingSource(colony: Colony, exceptRole: CreepRole) {
  const rolesUsingSource = [CreepRole.HARVESTER, CreepRole.UPGRADER, CreepRole.BUILDER].filter(f => f !== exceptRole);
  return colony.creeps.filter(creep => rolesUsingSource.includes(creep.memory.role)).length;
}

function countTotalSourceSlots(colony: Colony) {
  return _.sum(colony.sources.map(s => s.freeSpaceCount));
}

function getOptimalPopCount(colony: Colony, role: CreepRole) {
  switch (role) {
    case CreepRole.HARVESTER: {
      const totalSourceSlots = countTotalSourceSlots(colony);

      const min = colony.sources.length;
      const max = totalSourceSlots - countCreepsUsingSource(colony, role);
      return [min, max];
    }

    case CreepRole.UPGRADER: {
      const totalSourceSlots = countTotalSourceSlots(colony);

      const min = 2;
      const max = totalSourceSlots - countCreepsUsingSource(colony, role);
      return [min, max];
    }

    case CreepRole.BUILDER: {
      const totalSourceSlots = countTotalSourceSlots(colony);
      const maxSourceSlots = totalSourceSlots - countCreepsUsingSource(colony, role);

      const buildingCount = colony.constructionSites.length;

      // Try to always have 2 builder handy, with one per construction site
      const min = Math.min(Math.max(2, Math.ceil(buildingCount / 1.5)), maxSourceSlots);
      // Cap the max count to the minimum of builders needed, or 2
      const max = Math.max(min, 2);

      return [min, max];
    }

    case CreepRole.RECLAIMER: {
      const drops: (Resource<ResourceConstant> | Tombstone)[] = [];
      for (const room of colony.rooms) {
        drops.concat(room.find(FIND_DROPPED_RESOURCES));
        const tombs = room.find(FIND_TOMBSTONES);
        if (tombs) {
          for (const tomb of tombs) {
            if (tomb.store.getUsedCapacity() > 0) drops.push(tomb);
          }
        }
      }
      const min = drops.length > 0 ? 1 : 0;
      return [min, 1];
    }

    default:
      return [-1, -1];
  }
}

interface PopulationStats {
  role: CreepRole;
  min: number;
  max: number;
  subtotal: number;
  total: number;
  delta: number;
}

function getCreepPopulation(colony: Colony): PopulationStats[] {
  const stats: PopulationStats[] = [];
  const groupedCreeps = _.groupBy(colony.creeps, c => c.role);

  const managers = AI.getManagedRoles();

  for (const role of managers.keys()) {
    const creeps = groupedCreeps[role] ?? [];
    const subtotal = creeps.length;

    const [min, max] = getOptimalPopCount(colony, role);

    const delta = min !== -1 ? subtotal - min : subtotal;

    const roleStats: PopulationStats = { role, min, max, subtotal, total: creeps.length, delta };
    stats.push(roleStats);
  }

  return stats;
}

export function manageCreeps(colony: Colony) {
  const creepPop = getCreepPopulation(colony);

  log.info(`Room "${String(colony.controllers[0].room)}" population stats:`);
  for (const pop of creepPop) {
    log.info(
      `\t${pop.role}: ${pop.subtotal}/${pop.total}, should optimally be in [${pop.min}...${pop.max}], delta: ${pop.delta}`
    );
  }
  log.info();

  for (const spawn of colony.spawns) {
    if (spawn.spawning) {
      log.info(`\t• spawning in progress, ${spawn.spawning.remainingTime} ticks left`);
    }
  }

  const popSortedByDelta = creepPop.sort((a, b) => a.delta - b.delta);

  // const energyRatio = colony.energyAvailable / colony.energyCapacityAvailable;
  const energyRatio = 1.0;

  let shouldSpawnRole;
  let growPop;
  while ((growPop = popSortedByDelta.shift())) {
    if (growPop.delta < 0) {
      // We need that pop real bad
      log.info(`\t• ${growPop.role} pop needs to grow`);
      shouldSpawnRole = growPop.role;
      break;
    } else if (
      growPop.delta >= 0 &&
      (growPop.max === -1 || growPop.delta + (growPop.min !== -1 ? growPop.min : 0) < growPop.max)
    ) {
      // We already are over the minimum cap, make sure we don't go over the max
      if (energyRatio > 0.8) {
        log.info(`\t• ${growPop.role} pop should grow`);
        shouldSpawnRole = growPop.role;
        break;
      } else {
        log.info(`\t• ${growPop.role} pop should grow, but insufficent energy`);
        break;
      }
    }
  }

  if (!growPop) {
    log.info(`\t• Population cannot grow anymore`);
    return;
  }
  log.info();

  if (shouldSpawnRole) {
    colony.tryAndSpawnCreep(shouldSpawnRole);
  }
}
