declare namespace NodeJS {
  interface Global {
    Colony: typeof import("../colony/colony").Colony;
    Log: import("../console/log").Log;
  }
}

interface Memory {
  settings: { log: import("../console/log").LogSettings };
}

interface Game {
  myRooms: Room[];
}
