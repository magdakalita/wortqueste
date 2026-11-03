// Pixel-art sprites drawn in code – no external image assets.
// Each sprite is a grid of palette letters; "." is transparent.

export const TILE = 32;

export const CHARACTERS = [
  { id: "mila",  name: "Mila",  house: "Haus Feuerfalke",    robe: "#7a1520", robeDark: "#4e0b12", accent: "#e8b923", hair: "#5a3214", skin: "#f1c9a5" },
  { id: "jonas", name: "Jonas", house: "Haus Waldhirsch",    robe: "#1f5a2c", robeDark: "#123a1b", accent: "#c9d1c8", hair: "#e3c26a", skin: "#f6d3b3" },
  { id: "aylin", name: "Aylin", house: "Haus Sternenrabe",   robe: "#1d3a7a", robeDark: "#11234d", accent: "#b9874a", hair: "#1b1410", skin: "#d8a47f" },
  { id: "theo",  name: "Theo",  house: "Haus Bernsteinfuchs", robe: "#b8860b", robeDark: "#7a5806", accent: "#2b2b2b", hair: "#b5481d", skin: "#f3cfb0" },
];

const BODY = [
  "...hhhhhh...",
  "..hhhhhhhh..",
  "..hhsssssh..",
  "..hsseseshh.",
  "..hsssssss..",
  "...ssssss...",
  "...yyyyyy...",
  "..rryyrrrr..",
  ".rrrrrrrrrr.",
  ".srrrrrrrrsw",
  "..rrrrrrrr.w",
  "..rrrrrrrr..",
  "..rrrRRrrr..",
  "..RRRRRRRR..",
];
const LEGS = {
  stand: ["...bb..bb...", "...bb..bb..."],
  walk1: ["..bb....bb..", "..bb....bb.."],
  walk2: ["....bbbb....", "....bbbb...."],
  jump:  ["..bb...bb...", ".bb.....bb.."],
};

const GHOST = [
  "...wwww...",
  "..wwwwww..",
  ".wwwwwwww.",
  ".wkwwwkww.",
  ".wkwwwkww.",
  ".wwwwwwww.",
  "wwwwkkwwww",
  "wwwwwwwwww",
  "wwwwwwwwww",
  "ww.ww.ww.w",
];

const BOOK = [
  "gggggggggggg",
  "gbbbbbbbbbbg",
  "gbbbbyybbbbg",
  "gbbbybbybbbg",
  "gbbbbbbybbbg",
  "gbbbbbybbbbg",
  "gbbbbbybbbbg",
  "gbbbbbbbbbbg",
  "gbbbbbybbbbg",
  "gggggggggggp",
  ".pppppppppp.",
];

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function paint(grid, palette, scale) {
  const h = grid.length;
  const w = Math.max(...grid.map((r) => r.length));
  const c = makeCanvas(w * scale, h * scale);
  const ctx = c.getContext("2d");
  grid.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = palette[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    });
  });
  return c;
}

const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

export function characterFrame(ch, pose) {
  return cached(`char:${ch.id}:${pose}`, () =>
    paint([...BODY, ...LEGS[pose]], {
      h: ch.hair, s: ch.skin, e: "#1a1a1a", y: ch.accent, r: ch.robe, R: ch.robeDark, b: "#2a1c12", w: "#6b4423",
    }, 2),
  );
}

export function drawCharacterPreview(canvas, ch) {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(characterFrame(ch, "stand"), 0, 0, canvas.width, canvas.height);
}

export function ghostSprite() {
  return cached("ghost", () => paint(GHOST, { w: "rgba(235,240,255,0.9)", k: "#2b2f4a" }, 3));
}

export function bookSprite() {
  return cached("book", () => paint(BOOK, { g: "#e8b923", b: "#5b2a86", y: "#f5d36b", p: "#f1e6c8" }, 2));
}

// ---------- Themes ----------

export const THEMES = {
  garden: {
    sky: ["#0b1030", "#1d2a5a", "#3a3f7a"],
    ground: { top: "#3f7d2f", topLight: "#6aa84f", fill: "#5b4030", fillDark: "#432e22", fillLight: "#6e4e3a" },
    block: { base: "#7d7a8c", dark: "#55526a", light: "#a8a5b8" },
    plank: { base: "#8a5a2b", dark: "#5e3a17", light: "#b07a40" },
    outdoor: true,
  },
  library: {
    sky: ["#1a0f0a", "#2b1a10", "#3a2414"],
    ground: { top: "#7a4a24", topLight: "#a0683a", fill: "#4a2c16", fillDark: "#341e0e", fillLight: "#5c3a1e" },
    block: { base: "#6b3f1f", dark: "#462812", light: "#8e5a30" },
    plank: { base: "#9a6a35", dark: "#6a441d", light: "#c08a4c" },
    outdoor: false,
  },
  dungeon: {
    sky: ["#0a0f0c", "#121c17", "#1a2a21"],
    ground: { top: "#3d5a3a", topLight: "#5e8a4f", fill: "#3a3d40", fillDark: "#26282b", fillLight: "#4d5155" },
    block: { base: "#4d5155", dark: "#2e3134", light: "#6b7075" },
    plank: { base: "#5a4a35", dark: "#3a2f20", light: "#7a6548" },
    outdoor: false,
  },
  tower: {
    sky: ["#120a2a", "#2d1854", "#5a2d6e"],
    ground: { top: "#8c8aa0", topLight: "#b5b3c8", fill: "#5d5a70", fillDark: "#454257", fillLight: "#757289" },
    block: { base: "#6e6b82", dark: "#4a475c", light: "#9592a8" },
    plank: { base: "#7a5530", dark: "#523718", light: "#a07040" },
    outdoor: true,
  },
};

function brickPattern(ctx, x, y, size, c) {
  ctx.fillStyle = c.fill;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = c.fillDark;
  const h = size / 4;
  for (let r = 0; r < 4; r++) {
    ctx.fillRect(x, y + r * h, size, 2);
    const off = r % 2 ? size / 2 : 0;
    ctx.fillRect(x + off, y + r * h, 2, h);
    ctx.fillRect(x + (off + size / 2) % size, y + r * h, 2, h);
  }
  ctx.fillStyle = c.fillLight;
  for (let r = 0; r < 4; r++) ctx.fillRect(x + 3 + (r % 2) * 10, y + r * h + 3, 5, 2);
}

export function tileSprite(themeName, kind) {
  return cached(`tile:${themeName}:${kind}`, () => {
    const t = THEMES[themeName];
    const c = makeCanvas(TILE, TILE);
    const ctx = c.getContext("2d");
    if (kind === "ground-top" || kind === "ground") {
      brickPattern(ctx, 0, 0, TILE, t.ground);
      if (kind === "ground-top") {
        ctx.fillStyle = t.ground.top;
        ctx.fillRect(0, 0, TILE, 8);
        ctx.fillStyle = t.ground.topLight;
        ctx.fillRect(0, 0, TILE, 3);
        for (let i = 0; i < TILE; i += 6) ctx.fillRect(i, 8, 3, 3);
      }
    } else if (kind === "block") {
      const b = t.block;
      ctx.fillStyle = b.base;
      ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = b.light;
      ctx.fillRect(0, 0, TILE, 3);
      ctx.fillRect(0, 0, 3, TILE);
      ctx.fillStyle = b.dark;
      ctx.fillRect(0, TILE - 3, TILE, 3);
      ctx.fillRect(TILE - 3, 0, 3, TILE);
      ctx.fillRect(0, TILE / 2 - 1, TILE, 2);
      ctx.fillRect(TILE / 2 - 1, 0, 2, TILE / 2);
    } else if (kind === "plank") {
      const p = t.plank;
      ctx.fillStyle = p.base;
      ctx.fillRect(0, 0, TILE, 10);
      ctx.fillStyle = p.light;
      ctx.fillRect(0, 0, TILE, 2);
      ctx.fillStyle = p.dark;
      ctx.fillRect(0, 8, TILE, 2);
      ctx.fillRect(TILE - 2, 0, 2, 10);
      ctx.fillRect(4, 10, 3, 6);
      ctx.fillRect(TILE - 7, 10, 3, 6);
    }
    return c;
  });
}

// ---------- Decorations & entities drawn directly ----------

export function drawStar(ctx, x, y, t) {
  const s = Math.abs(Math.cos(t * 3)) * 0.8 + 0.2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, 1);
  ctx.fillStyle = "#f5d36b";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 4 : 10;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff4c2";
  ctx.fillRect(-2, -4, 3, 3);
  ctx.restore();
}

export function drawTorch(ctx, x, y, t) {
  ctx.fillStyle = "#4a3020";
  ctx.fillRect(x - 3, y, 6, 14);
  ctx.fillStyle = "#2b2b2b";
  ctx.fillRect(x - 6, y - 2, 12, 4);
  const f = Math.sin(t * 12 + x) * 2;
  const g = ctx.createRadialGradient(x, y - 8, 2, x, y - 8, 46);
  g.addColorStop(0, "rgba(255,180,60,0.35)");
  g.addColorStop(1, "rgba(255,180,60,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - 46, y - 54, 92, 92);
  ctx.fillStyle = "#ff8a1c";
  ctx.beginPath();
  ctx.ellipse(x, y - 8 + f / 2, 5, 9 + f, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe066";
  ctx.beginPath();
  ctx.ellipse(x, y - 5, 2.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPortrait(ctx, x, y, seed) {
  ctx.fillStyle = "#b8860b";
  ctx.fillRect(x, y, 34, 42);
  ctx.fillStyle = ["#3a5a7a", "#6a3a5a", "#3a6a4a"][seed % 3];
  ctx.fillRect(x + 4, y + 4, 26, 34);
  ctx.fillStyle = "#f1c9a5";
  ctx.fillRect(x + 12, y + 10, 10, 10);
  ctx.fillStyle = ["#ddd", "#5a3214", "#222"][seed % 3];
  ctx.fillRect(x + 11, y + 7, 12, 5);
  ctx.fillStyle = "#2b2b4a";
  ctx.fillRect(x + 9, y + 22, 16, 16);
}

export function drawWindow(ctx, x, y, t) {
  ctx.fillStyle = "#2a2a3a";
  ctx.fillRect(x - 2, y - 2, 32, 54);
  ctx.beginPath();
  ctx.arc(x + 14, y + 12, 16, Math.PI, 0);
  ctx.fill();
  const glow = 0.6 + Math.sin(t * 2 + x) * 0.1;
  ctx.fillStyle = `rgba(90,120,220,${glow})`;
  ctx.fillRect(x + 2, y + 12, 24, 36);
  ctx.beginPath();
  ctx.arc(x + 14, y + 12, 12, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "rgba(220,60,90,0.6)";
  ctx.fillRect(x + 2, y + 24, 11, 10);
  ctx.fillStyle = "rgba(240,200,60,0.6)";
  ctx.fillRect(x + 15, y + 34, 11, 14);
  ctx.fillStyle = "#2a2a3a";
  ctx.fillRect(x + 13, y, 2, 48);
  ctx.fillRect(x + 2, y + 30, 24, 2);
}

export function drawCauldron(ctx, x, y, t) {
  ctx.fillStyle = "#1c1c1c";
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 16, 18, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4cff6a";
  ctx.fillRect(x + 2, y + 2, 28, 4);
  for (let i = 0; i < 3; i++) {
    const by = y - ((t * 30 + i * 13) % 34);
    ctx.globalAlpha = 1 - (y - by) / 34;
    ctx.beginPath();
    ctx.arc(x + 8 + i * 8, by, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ff7a1c";
  ctx.fillRect(x + 6, y + 30, 4, 3);
  ctx.fillRect(x + 22, y + 30, 4, 3);
}

export function drawDoor(ctx, x, y, open, t) {
  // 1 tile wide, 2 tiles tall
  ctx.fillStyle = "#2a1a10";
  ctx.fillRect(x - 3, y - 3, TILE + 6, TILE * 2 + 3);
  if (open) {
    ctx.fillStyle = "#0a0612";
    ctx.fillRect(x, y, TILE, TILE * 2);
    ctx.fillStyle = "rgba(180,140,255,0.25)";
    ctx.fillRect(x + 4, y + 4, TILE - 8, TILE * 2 - 4);
    return;
  }
  ctx.fillStyle = "#6b3f1f";
  ctx.fillRect(x, y, TILE, TILE * 2);
  ctx.fillStyle = "#4a2a12";
  for (let i = 6; i < TILE; i += 8) ctx.fillRect(x + i, y, 2, TILE * 2);
  ctx.fillStyle = "#2b2b2b";
  ctx.fillRect(x, y + 12, TILE, 4);
  ctx.fillRect(x, y + 46, TILE, 4);
  const pulse = 0.5 + Math.sin(t * 4) * 0.5;
  ctx.fillStyle = `rgba(190,120,255,${0.5 + pulse * 0.5})`;
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + 30, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + TILE / 2 - 2, y + 30, 4, 9);
  ctx.fillStyle = `rgba(190,120,255,${0.15 * pulse})`;
  ctx.fillRect(x - 6, y - 6, TILE + 12, TILE * 2 + 6);
}

export function drawSphinx(ctx, x, y, solvedCount, total, t) {
  // occupies 2 tiles wide, 3 tall; (x, y) is the top-left
  const w = TILE * 2;
  ctx.fillStyle = "#c9a45a";
  ctx.fillRect(x + 4, y + 36, w - 8, 60); // body
  ctx.fillStyle = "#a8853e";
  ctx.fillRect(x + 4, y + 86, w - 8, 10);
  ctx.fillStyle = "#c9a45a";
  ctx.fillRect(x + 14, y + 8, 36, 34); // head
  ctx.fillStyle = "#2d5aa8";
  ctx.fillRect(x + 10, y + 4, 44, 8); // headdress
  ctx.fillRect(x + 10, y + 4, 8, 40);
  ctx.fillRect(x + 46, y + 4, 8, 40);
  ctx.fillStyle = "#e8b923";
  for (let i = 0; i < 5; i++) ctx.fillRect(x + 10, y + 10 + i * 8, 8, 3);
  for (let i = 0; i < 5; i++) ctx.fillRect(x + 46, y + 10 + i * 8, 8, 3);
  const eye = 0.6 + Math.sin(t * 3) * 0.4;
  ctx.fillStyle = `rgba(120,220,255,${eye})`;
  ctx.fillRect(x + 22, y + 20, 6, 4);
  ctx.fillRect(x + 36, y + 20, 6, 4);
  ctx.fillStyle = "#7a5c28";
  ctx.fillRect(x + 28, y + 32, 8, 3);
  // runes show progress
  for (let i = 0; i < total; i++) {
    ctx.fillStyle = i < solvedCount ? "#4cff6a" : "#3a2d14";
    ctx.fillRect(x + 12 + i * 12, y + 60, 8, 8);
  }
}

export function drawPortal(ctx, x, y, t) {
  // 2 tiles tall glowing arch
  ctx.fillStyle = "#555266";
  ctx.fillRect(x - 6, y - 10, TILE + 12, TILE * 2 + 10);
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y - 10, TILE / 2 + 6, Math.PI, 0);
  ctx.fill();
  const g = ctx.createLinearGradient(x, y, x, y + TILE * 2);
  const h = (t * 60) % 360;
  g.addColorStop(0, `hsl(${h},80%,70%)`);
  g.addColorStop(1, `hsl(${(h + 120) % 360},80%,45%)`);
  ctx.fillStyle = g;
  ctx.fillRect(x, y - 10, TILE, TILE * 2 + 10);
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y - 10, TILE / 2, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  for (let i = 0; i < 4; i++) {
    const py = y + TILE * 2 - ((t * 40 + i * 17) % (TILE * 2));
    ctx.fillRect(x + 6 + i * 6, py, 2, 2);
  }
}

// ---------- Backgrounds ----------

function rand(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const starField = (() => {
  const r = rand(42);
  return Array.from({ length: 120 }, () => ({ x: r() * 960, y: r() * 360, s: r() * 2 + 1, p: r() * 6 }));
})();

function drawSky(ctx, theme, w, h, t) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, theme.sky[0]);
  g.addColorStop(0.6, theme.sky[1]);
  g.addColorStop(1, theme.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  if (!theme.outdoor) return;
  for (const s of starField) {
    ctx.globalAlpha = 0.5 + Math.sin(t * 2 + s.p) * 0.5;
    ctx.fillStyle = "#fff";
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;
}

function drawMoon(ctx, x, y, r) {
  ctx.fillStyle = "rgba(255,250,220,0.15)";
  ctx.beginPath();
  ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fdf6d8";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e6dcb4";
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.2, 0, Math.PI * 2);
  ctx.arc(x + r * 0.35, y + r * 0.25, r * 0.15, 0, Math.PI * 2);
  ctx.fill();
}

function drawCastleSilhouette(ctx, offset, baseY, t) {
  const width = 1400;
  const start = -((offset % width) + width) % width;
  for (let k = start; k < 960 + width; k += width) {
    ctx.fillStyle = "#151233";
    const towers = [[60, 140, 40], [180, 220, 56], [300, 160, 44], [420, 260, 70], [560, 180, 48], [700, 300, 80], [860, 200, 50], [1000, 240, 60], [1160, 170, 44], [1280, 210, 52]];
    ctx.fillRect(k, baseY - 110, width, 110);
    for (const [x, hgt, wd] of towers) {
      ctx.fillRect(k + x, baseY - hgt, wd, hgt);
      ctx.beginPath();
      ctx.moveTo(k + x - 8, baseY - hgt);
      ctx.lineTo(k + x + wd / 2, baseY - hgt - wd * 1.1);
      ctx.lineTo(k + x + wd + 8, baseY - hgt);
      ctx.fill();
    }
    for (const [x, hgt, wd] of towers) {
      for (let wy = baseY - hgt + 20; wy < baseY - 30; wy += 34) {
        const on = Math.sin(x * 7 + wy) > -0.3;
        if (!on) continue;
        ctx.fillStyle = `rgba(255,200,90,${0.7 + Math.sin(t * 1.5 + x + wy) * 0.2})`;
        ctx.fillRect(k + x + wd / 2 - 4, wy, 8, 12);
      }
    }
  }
}

function drawHills(ctx, offset, baseY, color, amp, freq) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 544);
  for (let x = 0; x <= 960; x += 16) {
    const wx = x + offset;
    ctx.lineTo(x, baseY - Math.sin(wx * freq) * amp - Math.sin(wx * freq * 2.7) * amp * 0.4);
  }
  ctx.lineTo(960, 544);
  ctx.fill();
}

function drawShelves(ctx, offset, t) {
  const width = 192;
  const start = -((offset % width) + width) % width;
  const colors = ["#7a1d1d", "#1d4a7a", "#2c6a2c", "#7a6a1d", "#5a2a7a", "#8a4a1d"];
  for (let x = start; x < 960; x += width) {
    ctx.fillStyle = "#2a160a";
    ctx.fillRect(x + 8, 40, width - 16, 460);
    for (let shelf = 0; shelf < 6; shelf++) {
      const sy = 60 + shelf * 74;
      ctx.fillStyle = "#4a2a14";
      ctx.fillRect(x + 8, sy + 58, width - 16, 8);
      let bx = x + 14;
      let i = shelf * 7 + Math.floor(x / width);
      while (bx < x + width - 22) {
        const bw = 8 + ((i * 37) % 9);
        const bh = 38 + ((i * 53) % 18);
        ctx.fillStyle = colors[Math.abs(i) % colors.length];
        ctx.fillRect(bx, sy + 58 - bh, bw, bh);
        ctx.fillStyle = "rgba(255,220,120,0.35)";
        ctx.fillRect(bx + 2, sy + 62 - bh, bw - 4, 2);
        bx += bw + 2;
        i++;
      }
    }
  }
}

function drawCandles(ctx, offset, t) {
  for (let i = 0; i < 14; i++) {
    const x = ((i * 157 - offset) % 1100 + 1100) % 1100 - 70;
    const y = 50 + ((i * 71) % 140) + Math.sin(t * 1.5 + i) * 6;
    ctx.fillStyle = "#f3ead2";
    ctx.fillRect(x, y, 6, 18);
    ctx.fillStyle = "rgba(255,200,80,0.25)";
    ctx.beginPath();
    ctx.arc(x + 3, y - 4, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffcc33";
    ctx.fillRect(x + 1, y - 7, 4, 6);
  }
}

function drawDungeonWall(ctx, offset) {
  const bw = 64;
  const bh = 32;
  for (let row = 0; row < 18; row++) {
    const shift = (row % 2) * bw / 2;
    const start = -((offset + shift) % bw + bw) % bw;
    for (let x = start; x < 960; x += bw) {
      const shade = 22 + ((row * 13 + Math.floor((x + offset) / bw) * 7) % 10);
      ctx.fillStyle = `rgb(${shade},${shade + 6},${shade + 2})`;
      ctx.fillRect(x + 1, row * bh + 1, bw - 2, bh - 2);
    }
  }
  const g = ctx.createRadialGradient(480, 480, 40, 480, 480, 500);
  g.addColorStop(0, "rgba(60,255,120,0.10)");
  g.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 960, 544);
}

function drawTowerBricks(ctx, offset) {
  ctx.fillStyle = "rgba(30,20,50,0.55)";
  const start = -((offset % 400) + 400) % 400;
  for (let x = start; x < 960; x += 400) {
    ctx.fillRect(x + 40, 380, 120, 164);
    ctx.fillRect(x + 30, 370, 140, 14);
    for (let i = 0; i < 7; i++) ctx.fillRect(x + 30 + i * 22, 356, 12, 14);
  }
}

export function drawBackground(ctx, themeName, camX, t) {
  const theme = THEMES[themeName];
  drawSky(ctx, theme, 960, 544, t);
  if (themeName === "garden") {
    drawMoon(ctx, 800 - camX * 0.02, 90, 34);
    drawCastleSilhouette(ctx, camX * 0.15, 380, t);
    drawHills(ctx, camX * 0.4, 440, "#14213a", 22, 0.006);
    drawHills(ctx, camX * 0.6, 470, "#1b2e2a", 14, 0.011);
  } else if (themeName === "library") {
    drawShelves(ctx, camX * 0.5, t);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, 960, 544);
    drawCandles(ctx, camX * 0.3, t);
  } else if (themeName === "dungeon") {
    drawDungeonWall(ctx, camX * 0.5);
  } else if (themeName === "tower") {
    drawMoon(ctx, 760 - camX * 0.02, 120, 60);
    drawHills(ctx, camX * 0.1, 470, "#1a1035", 50, 0.004);
    drawTowerBricks(ctx, camX * 0.35);
  }
}
