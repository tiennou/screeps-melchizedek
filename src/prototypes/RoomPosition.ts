Object.defineProperty(RoomPosition.prototype, "print", {
  get(this: RoomPosition) {
    return (
      '<a href="#!/room/' +
      Game.shard.name +
      "/" +
      this.roomName +
      '">[' +
      this.roomName +
      ", " +
      this.x +
      ", " +
      this.y +
      "]</a>"
    );
  },
  configurable: true,
});
