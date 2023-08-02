import { BlueprintType, stampBlueprint } from "./blueprint";

const MAX_PLANNED_SITES = 3;
const MAX_EXTENSION_DISTANCE = 3;

// const BUILDING_AVAILABILITY = {
//   STRUCTURE_EXTENSION: [
//     {
//       rcl_level: 1,
//       max_amount: 5,
//     },
//     {
//       rcl_level: 2,
//       max_amount: 5,
//     },
//     {
//       rcl_level: 3,
//       max_amount: 10,
//     },
//   ],
// };

export function scheduleExtension(room: Room, spawn: StructureSpawn) {
  // return;
  if (room.controller && room.controller.level < 1) return;

  let distance = 1;
  let sites;
  outer: do {
    const area: [number, number, number, number] = [
      spawn.pos.y - distance,
      spawn.pos.x - distance,
      spawn.pos.y + distance,
      spawn.pos.x + distance,
    ];
    sites = room.lookForAtArea(LOOK_TERRAIN, ...area, true);
    let site;
    while ((site = sites.shift())) {
      // console.log(`found empty spot at ${site.x}, ${site.y}`);
      const res = room.createConstructionSite(site.x, site.y, STRUCTURE_EXTENSION);
      // const res = ERR_INVALID_TARGET;
      if (res === OK) {
        console.log(`successfully created structure`);
        break outer;
      }
      if (res === ERR_INVALID_TARGET) {
        // console.log(`failed to create structure at site, trying again`);
        continue;
      } else {
        // console.log(`failed to create structure at site (${res}), aborting`);
        break outer;
      }
    }

    console.log(`increasing distance to ${distance}`);
    distance++;
  } while (distance <= MAX_EXTENSION_DISTANCE);

  if (distance > MAX_EXTENSION_DISTANCE) {
    console.log(`failed to find empty space around ${String(spawn.pos)}, distance ${distance}`);
    return;
  }
}

export function scheduleSpawnRoundabout(room: Room, spawn: StructureSpawn) {
  stampBlueprint(room, BlueprintType.ROUNDABOUT, spawn.pos);
}

export function scheduleBuildings(room: Room) {
  return;
  // @ts-expect-error WIP
  const roomConstructions = room.constructionSites;

  if (Game.time % 100 === 0) console.log(`Room ${room.name}: currently building ${roomConstructions.length}`);

  if (roomConstructions.length >= MAX_PLANNED_SITES) return;

  // Locate our spawn
  const spawns = room.find(FIND_MY_SPAWNS);
  if (spawns.length <= 0) return;

  const spawn = spawns[0];

  scheduleExtension(room, spawn);
}
