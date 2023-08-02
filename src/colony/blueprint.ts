import { log } from "console/log";
import { errorForCode } from "utilities/utils";

export enum BlueprintType {
  EXTENSION = "extension",
  ROUNDABOUT = "roundabout",
}

/**
 * "*" - anything
 * "?" - anything but terrain block
 * "r" - a road
 * "e" - an extension
 */
const EXTENSION_BLUEPRINT_LAYOUT = {
  layout: ["**r**", "*rer*", "reeer", "*rer*", "**r**"],
  offset: [3, 3],
};

const ROUNDABOUT_LAYOUT = {
  layout: ["**r**", "*r?r*", "r???r", "*r?r*", "**r**"],
  offset: [3, 3],
};

function layoutDataForBlueprint(blueprint: BlueprintType) {
  if (blueprint === BlueprintType.EXTENSION) return EXTENSION_BLUEPRINT_LAYOUT;
  if (blueprint === BlueprintType.ROUNDABOUT) return ROUNDABOUT_LAYOUT;
  return null;
}

export function getLocationForBlueprint(room: Room, blueprint: BlueprintType, hint: RoomPosition) {
  return hitCheckBlueprint(room, blueprint, false, hint);
}

export function stampBlueprint(room: Room, blueprint: BlueprintType, hint: RoomPosition) {
  return hitCheckBlueprint(room, blueprint, true, hint);
}

function hitCheckBlueprint(room: Room, blueprint: BlueprintType, build: boolean, hint: RoomPosition) {
  const layoutData = layoutDataForBlueprint(blueprint);
  if (!layoutData) return null;

  const { layout, offset } = layoutData;
  const width = layout[0].length;
  const height = layout.length;

  if (!hint) {
    const spawns = room.find(FIND_MY_SPAWNS);
    if (!spawns) return;
    hint = spawns[0].pos;
  }

  // const loc = new RoomPosition(hint.x, hint.y, room.name);
  const origin = new RoomPosition(hint.x - offset[0] + 1, hint.y - offset[1] + 1, room.name);

  // room.createFlag(loc.x, loc.y, "loc", COLOR_CYAN);
  // room.createFlag(origin.x, origin.y, "origin", COLOR_GREEN);

  // We have a location hint, grab the room terrain and try to smack the blueprint there
  const terrain = room.getTerrain();
  const structures = room.lookForAtArea(LOOK_STRUCTURES, origin.y, origin.x, origin.y + height, origin.x + width);
  const constructions = room.lookForAtArea(
    LOOK_CONSTRUCTION_SITES,
    origin.y,
    origin.x,
    origin.y + height,
    origin.x + width
  );

  function checkTerrain(x: number, y: number) {
    if (terrain.get(x, y) !== 0) {
      log.debug(`terrain blocking at ${x}:${y}`);
      room.createFlag(x, y, "terrain", COLOR_RED);
      return false;
    }
    return true;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {StructureConstant} [allow]
   * @returns {boolean} true if there's no structure blocking, or there's a structure of the expected type, false otherwise
   */
  function checkStructure(x: number, y: number, allow?: StructureConstant, skipFlag: boolean = false) {
    const objs = structures[y][x];
    log.debug(
      `${x}:${y}, objs: "${String(objs)}", allow: ${allow}, types: ${String(
        objs.map(o => o.structure.structureType)
      )}, cond: ${objs && ((!allow && objs.length > 0) || !objs.every(o => o.structure.structureType === allow))}`
    );
    if (objs && ((!allow && objs.length > 0) || !objs.every(o => o.structure.structureType === allow))) {
      log.debug(`structure blocking at ${x}:${y}`);
      if (!skipFlag) room.createFlag(x, y, "structure", COLOR_RED);
      return false;
    }
    return true;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param [allow]
   * @returns true if there's no construction blocking, or there's a construction of the expected type, false otherwise
   */
  function checkConstructions(x: number, y: number, allow?: StructureConstant, skipFlag: boolean = false) {
    const objs = constructions[y][x];
    if (objs && ((!allow && objs.length > 0) || !objs.every(o => o.constructionSite.structureType === allow))) {
      log.debug(
        `construction blocking at ${x}:${y}: ${allow}, ${String(objs.map(o => o.constructionSite.structureType))}`
      );
      if (!skipFlag) room.createFlag(x, y, "construction", COLOR_RED);
      return false;
    }
    return true;
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const mark = layout[x][y];
      const pos = new RoomPosition(origin.x + x, origin.y + y, room.name);
      if (mark !== "*" && !checkTerrain(pos.x, pos.y)) return false;

      if (mark === "*" || mark === "?") continue;

      const markToStructure: Record<string, BuildableStructureConstant> = {
        r: STRUCTURE_ROAD,
        e: STRUCTURE_EXTENSION,
      };

      const structType = markToStructure[mark];
      if (!structType) {
        log.error(`unknown marker "${mark}" in blueprint`);
        return false;
      }

      if (!checkStructure(pos.x, pos.y, structType) || !checkConstructions(pos.x, pos.y, structType)) {
        return false;
      }

      if (build) {
        // We redo the hitcheck, without the expected structure.
        // This should cause the test to fail, meaning the structure is already there.
        if (!checkStructure(pos.x, pos.y, undefined, true) || !checkConstructions(pos.x, pos.y, undefined, true)) {
          log.debug(`somthing? ${String(pos)}`);
          continue;
        }

        const result = room.createConstructionSite(pos.x, pos.y, structType);
        if (result !== OK) {
          log.error(`failed to build ${structType} at ${String(pos)}, ${errorForCode(result)}`);
          room.createFlag(x, y, "build", COLOR_RED);
          return false;
        }
      }
    }
  }
  return true;
}

export function makeRoad(room: Room, from: RoomPosition, to: RoomPosition) {
  // const ret = PathFinder.search(from, to);
  const path = room.findPath(from, to, { ignoreCreeps: true });
  if (path.length <= 0) return false;

  for (const point of path) {
    const result = room.createConstructionSite(point.x, point.y, STRUCTURE_ROAD);
    if (result !== OK) {
      log.error(`failed to lay road at ${point.x}:${point.y}: ${errorForCode(result)}`);
    }
  }
  return true;
}
