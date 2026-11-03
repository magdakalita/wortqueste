// Level definitions. Each level is built from platforming chunks (see builder.js)
// with one magic door or spell book per task, so any number of tasks fits.

export const LEVELS = [
  {
    n: 1,
    title: "Der Schlossgarten",
    topic: "Wortschatz",
    theme: "garden",
    chunksPerTask: [1, 1],
    pool: ["flat", "pitSmall", "steps", "ghostFlat"],
  },
  {
    n: 2,
    title: "Die Bibliothek",
    topic: "Redemittel & Satzbau",
    theme: "library",
    chunksPerTask: [1, 2],
    pool: ["flat", "pitSmall", "steps", "ghostFlat", "shelves", "pillars"],
  },
  {
    n: 3,
    title: "Der Zaubertrank-Keller",
    topic: "obwohl & trotzdem",
    theme: "dungeon",
    chunksPerTask: [1, 2],
    pool: ["pitSmall", "steps", "ghostFlat", "shelves", "pillars", "highRoute", "doublePit"],
  },
  {
    n: 4,
    title: "Der Astronomieturm",
    topic: "Schreiben & Wiederholung",
    theme: "tower",
    chunksPerTask: [1, 2],
    pool: ["steps", "ghostFlat", "shelves", "pillars", "highRoute", "doublePit"],
    bossTasks: 2, // the last N tasks are asked by the sphinx at the top of the tower
  },
];
