// Builds a level map from small hand-made chunks.
//
// Chunk legend (bottom 8 rows of the 17-row map; row 15 is the ground surface):
//   #  ground        =  stone block     -  one-way platform
//   *  star          g  ghost

export const ROWS = 17;
const CHUNK_TOP = ROWS - 8;
const GROUND_ROW = 15;

const CHUNKS = {
  flat: [
    "         ",
    "         ",
    "         ",
    "   * *   ",
    "         ",
    "         ",
    "#########",
    "#########",
  ],
  pitSmall: [
    "           ",
    "           ",
    "           ",
    "     **    ",
    "           ",
    "           ",
    "####  #####",
    "####  #####",
  ],
  steps: [
    "            ",
    "            ",
    "       *    ",
    "      ===   ",
    "   *        ",
    "  ===       ",
    "############",
    "############",
  ],
  ghostFlat: [
    "            ",
    "            ",
    "            ",
    "            ",
    "    *  *    ",
    "       g    ",
    "############",
    "############",
  ],
  shelves: [
    "              ",
    "              ",
    "     * *      ",
    "    -----     ",
    "              ",
    "              ",
    "###        ###",
    "###        ###",
  ],
  pillars: [
    "             ",
    "             ",
    "        *    ",
    "       ==    ",
    "   *   ==    ",
    "  ==   ==    ",
    "#############",
    "#############",
  ],
  highRoute: [
    "               ",
    "      * * *    ",
    "     -------   ",
    "               ",
    "  ==           ",
    "  ==        g  ",
    "###############",
    "###############",
  ],
  doublePit: [
    "              ",
    "              ",
    "              ",
    "   *    *     ",
    "              ",
    "              ",
    "##  ###  #####",
    "##  ###  #####",
  ],
};

function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function buildLevel(def, tasks) {
  const rand = rng(def.n * 7919 + tasks.length * 31);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const columns = []; // each column: array of ROWS chars
  const stars = [];
  const ghosts = [];
  const triggers = [];

  const emptyColumn = () => Array(ROWS).fill(" ");
  const groundColumn = () => {
    const col = emptyColumn();
    col[GROUND_ROW] = "#";
    col[GROUND_ROW + 1] = "#";
    return col;
  };

  function addChunk(name) {
    const chunk = CHUNKS[name];
    const width = chunk[0].length;
    for (let x = 0; x < width; x++) {
      const col = emptyColumn();
      chunk.forEach((row, r) => {
        const ch = row[x] ?? " ";
        const y = CHUNK_TOP + r;
        if (ch === "*") stars.push({ col: columns.length, row: y });
        else if (ch === "g") ghosts.push({ col: columns.length, row: y });
        else col[y] = ch;
      });
      columns.push(col);
    }
  }

  function addFlat(n) {
    for (let i = 0; i < n; i++) columns.push(groundColumn());
  }

  // A wall with a magic door – blocks the way until the task is solved.
  function addDoor(taskIds) {
    addFlat(3);
    const col = groundColumn();
    for (let r = 0; r < GROUND_ROW - 2; r++) col[r] = "=";
    triggers.push({ kind: "door", col: columns.length, row: GROUND_ROW - 2, taskIds });
    columns.push(col);
    addFlat(3);
  }

  // A floating spell book – a bonus task.
  function addBook(taskIds) {
    addFlat(3);
    triggers.push({ kind: "book", col: columns.length, row: GROUND_ROW - 4, taskIds });
    addFlat(4);
  }

  function addSphinx(taskIds) {
    addFlat(4);
    const at = columns.length;
    for (let i = 0; i < 2; i++) {
      const col = groundColumn();
      for (let r = 0; r < GROUND_ROW - 3; r++) col[r] = "=";
      columns.push(col);
    }
    triggers.push({ kind: "sphinx", col: at, row: GROUND_ROW - 3, taskIds });
    addFlat(3);
  }

  // Start
  addFlat(8);
  const start = { col: 3, row: GROUND_ROW - 1 };

  const bossCount = def.bossTasks ?? 0;
  const regular = tasks.slice(0, tasks.length - bossCount);
  const boss = tasks.slice(tasks.length - bossCount);

  regular.forEach((task, i) => {
    const [min, max] = def.chunksPerTask;
    const n = min + Math.floor(rand() * (max - min + 1));
    for (let k = 0; k < n; k++) addChunk(pick(def.pool));
    const isBook = i % 3 === 1 && task.type !== "free_writing";
    if (isBook) addBook([task.id]);
    else addDoor([task.id]);
  });

  if (boss.length) {
    addChunk(pick(def.pool));
    addSphinx(boss.map((t) => t.id));
  }

  addFlat(4);
  const finish = { col: columns.length, row: GROUND_ROW - 2 };
  addFlat(10);

  // Right edge wall
  for (let i = 0; i < 2; i++) {
    const col = emptyColumn();
    col.fill("=");
    columns.push(col);
  }

  const width = columns.length;
  const tiles = Array.from({ length: ROWS }, (_, r) => columns.map((c) => c[r]));

  const decorations = decorate(def.theme, tiles, width, rand);

  return { width, height: ROWS, tiles, stars, ghosts, triggers, start, finish, decorations };
}

function decorate(theme, tiles, width, rand) {
  const decorations = [];
  const free = (col, row) => tiles[row]?.[col] === " ";
  for (let col = 6; col < width - 4; col += 5 + Math.floor(rand() * 5)) {
    if (theme === "garden" || theme === "tower") {
      if (free(col, GROUND_ROW - 1) && tiles[GROUND_ROW][col] === "#" && rand() < 0.6) {
        decorations.push({ kind: "torch", col, row: GROUND_ROW - 1 });
      }
      continue;
    }
    const roll = rand();
    if (roll < 0.45 && free(col, 9)) decorations.push({ kind: "torch", col, row: 9 });
    else if (roll < 0.7 && free(col, 7) && free(col, 8)) decorations.push({ kind: theme === "library" ? "window" : "portrait", col, row: 7 });
    else if (theme === "dungeon" && free(col, GROUND_ROW - 1) && tiles[GROUND_ROW][col] === "#") decorations.push({ kind: "cauldron", col, row: GROUND_ROW - 1 });
    else if (free(col, 8)) decorations.push({ kind: "portrait", col, row: 8 });
  }
  return decorations;
}
