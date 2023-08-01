Object.defineProperty(Room.prototype, "sources", {
  get(this: Room): Source[] {
    // If we dont have the value stored locally
    if (!this._sources) {
      // If we dont have the value stored in memory
      if (!this.memory.sourceIds) {
        // Find the sources and store their id's in memory,
        // NOT the full objects
        this.memory.sourceIds = this.find(FIND_SOURCES).map(source => source.id);
      }
      // Get the source objects from the id's in memory and store them locally
      this._sources = this.memory.sourceIds.map(id => Game.getObjectById(id)).filter(s => s) as Source[];
    }
    // return the locally stored value
    return this._sources;
  },
  set(this: Room, newValue: Source[]) {
    // when storing in memory you will want to change the setter
    // to set the memory value as well as the local value
    this.memory.sourceIds = newValue.map(source => source.id);
    this._sources = newValue;
  },
  configurable: true,
});

Object.defineProperty(Room.prototype, "activeSources", {
  get(this: Room): Source[] {
    return this.sources.filter(s => s.energy > 0);
  },
  configurable: true,
});

Object.defineProperty(Room.prototype, "structures", {
  get(this: Room): Structure<StructureConstant>[] {
    if (!this._structures) {
      this._structures = _.filter(Game.structures, struct => struct.room.name === this.name);
    }
    return this._structures;
  },
  configurable: true,
});

Object.defineProperty(Room.prototype, "constructionSites", {
  get(this: Room): ConstructionSite<BuildableStructureConstant>[] {
    if (!this._constructionSites) {
      this._constructionSites = _.filter(Game.constructionSites, site => site.room && site.room.name === this.name);
    }
    return this._constructionSites;
  },
  configurable: true,
});
