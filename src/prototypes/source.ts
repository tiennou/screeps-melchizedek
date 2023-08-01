Object.defineProperty(Source.prototype, "memory", {
  get(this: Source) {
    if (_.isUndefined(Memory.sources)) {
      Memory.sources = {};
    }
    if (!_.isObject(Memory.sources)) {
      return undefined;
    }
    // eslint-disable-next-line
    return (Memory.sources[this.id] = Memory.sources[this.id] || {});
  },
  set(value: any) {
    if (_.isUndefined(Memory.sources)) {
      Memory.sources = {};
    }
    if (!_.isObject(Memory.sources)) {
      throw new Error("Could not set source memory");
    }
    // eslint-disable-next-line
    Memory.sources[this.id] = value;
  },
  configurable: true,
});

Object.defineProperty(Source.prototype, "freeSpaceCount", {
  get(): number {
    const src = this as Source;
    if (src._freeSpaceCount === undefined) {
      if (src.memory.freeSpaceCount === undefined) {
        let freeSpaceCount = 0;
        const terrain = Game.map.getRoomTerrain(src.pos.roomName);
        [src.pos.x - 1, src.pos.x, src.pos.x + 1].forEach(x => {
          [src.pos.y - 1, src.pos.y, src.pos.y + 1].forEach(y => {
            const isWall = !!(terrain.get(x, y) & TERRAIN_MASK_WALL);
            if (!isWall) freeSpaceCount++;
          }, this);
        }, this);
        src.memory.freeSpaceCount = freeSpaceCount;
      }
      src._freeSpaceCount = src.memory.freeSpaceCount;
    }
    return src._freeSpaceCount;
  },
  configurable: true,
});

Object.defineProperty(Source.prototype, "harvesters", {
  get(this: Source): Creep[] {
    // const this = this as Source;
    if (!this._harvesters) {
      this._harvesters = _.filter(Game.creeps, creep => creep.target === this);
    }
    return this._harvesters;
  },
  configurable: true,
});
