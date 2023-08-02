declare namespace NodeJS {
  interface Global {
    Colony: typeof import("../colony/colony").Colony;
  }
}

interface Game {
  myRooms: Room[];
}
