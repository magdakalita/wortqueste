import {
  TILE, characterFrame, ghostSprite, bookSprite, tileSprite, drawBackground, drawStar,
  drawTorch, drawPortrait, drawWindow, drawCauldron, drawDoor, drawSphinx, drawPortal, THEMES,
} from "../sprites.js";
import { ROWS } from "../levels/builder.js";

const W = 960;
const H = 544;
const GRAVITY = 2000;
const JUMP_V = 730;
const RUN = 230;
const MAX_FALL = 900;
const COYOTE = 0.1;
const JUMP_BUFFER = 0.12;
const MAX_HEARTS = 3;

export class Game {
  constructor(canvas, input, sfx, hooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.input = input;
    this.sfx = sfx;
    this.hooks = hooks; // { onTask(trigger) -> Promise<result[]>, onFinish(stats), onHud(state), onToast(msg) }
    this.running = false;
    this.mode = "idle";
    this.time = 0;
    this.frame = this.frame.bind(this);
  }

  load(def, map, character, taskCount) {
    this.def = def;
    this.map = map;
    this.character = character;
    this.taskCount = taskCount;
    this.theme = def.theme;
    this.stars = map.stars.map((s) => ({ x: s.col * TILE + TILE / 2, y: s.row * TILE + TILE / 2, taken: false }));
    this.ghosts = map.ghosts.map((g) => ({ x: g.col * TILE + 3, y: g.row * TILE + 2, w: 26, h: 28, vx: -45, dead: false, phase: g.col }));
    this.triggers = map.triggers.map((t) => ({ ...t, done: false, solved: 0 }));
    this.particles = [];
    this.player = {
      x: map.start.col * TILE, y: map.start.row * TILE + 4, w: 18, h: 28,
      vx: 0, vy: 0, onGround: false, facing: 1, coyote: 0, jumpBuffer: 0, invuln: 0, walkT: 0,
    };
    this.checkpoint = { x: this.player.x, y: this.player.y };
    this.hearts = MAX_HEARTS;
    this.starCount = 0;
    this.results = [];
    this.camX = 0;
    this.startedAt = performance.now();
    this.mode = "play";
    this.emitHud();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
  }

  setPaused(paused) {
    if (this.mode === "play" && paused) this.mode = "pause";
    else if (this.mode === "pause" && !paused) this.mode = "play";
    this.input.enabled = this.mode === "play";
    this.input.reset();
  }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min((now - this.last) / 1000, 1 / 30);
    this.last = now;
    this.time += dt;
    if (this.mode === "play") this.update(dt);
    this.updateParticles(dt);
    this.render();
    this.input.endFrame();
    requestAnimationFrame(this.frame);
  }

  // ---------- World queries ----------

  tileAt(col, row) {
    if (col < 0) return "=";
    if (row < 0 || row >= ROWS || col >= this.map.width) return " ";
    return this.map.tiles[row][col];
  }

  isSolid(col, row) {
    const t = this.tileAt(col, row);
    if (t === "#" || t === "=") return true;
    for (const tr of this.triggers) {
      if (tr.done) continue;
      if (tr.kind === "door" && col === tr.col && (row === tr.row || row === tr.row + 1)) return true;
      if (tr.kind === "sphinx" && col >= tr.col && col <= tr.col + 1 && row >= tr.row && row <= tr.row + 2) return true;
    }
    return false;
  }

  // ---------- Update ----------

  update(dt) {
    const p = this.player;
    const inp = this.input;

    const dir = (inp.down.has("right") ? 1 : 0) - (inp.down.has("left") ? 1 : 0);
    const target = dir * RUN;
    const accel = p.onGround ? 2200 : 1400;
    if (p.invuln > 1.2) {
      // knockback – no control for a moment
    } else if (target > p.vx) p.vx = Math.min(target, p.vx + accel * dt);
    else if (target < p.vx) p.vx = Math.max(target, p.vx - accel * dt);
    if (dir) p.facing = dir;

    p.coyote = p.onGround ? COYOTE : Math.max(0, p.coyote - dt);
    p.jumpBuffer = inp.wasPressed("jump") ? JUMP_BUFFER : Math.max(0, p.jumpBuffer - dt);
    if (p.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = -JUMP_V;
      p.coyote = 0;
      p.jumpBuffer = 0;
      p.onGround = false;
      this.sfx.play("jump");
    }
    if (!inp.down.has("jump") && p.vy < -260) p.vy = -260; // variable jump height

    p.vy = Math.min(MAX_FALL, p.vy + GRAVITY * dt);
    p.invuln = Math.max(0, p.invuln - dt);

    this.moveX(p, p.vx * dt);
    const prevBottom = p.y + p.h;
    p.onGround = false;
    this.moveY(p, p.vy * dt, prevBottom);

    p.walkT = p.onGround && Math.abs(p.vx) > 20 ? p.walkT + dt : 0;

    if (p.y > ROWS * TILE + 64) {
      this.hurt(true);
      return;
    }

    this.updateGhosts(dt);
    this.collectStars();
    this.checkTriggers();
    this.checkFinish();

    const targetCam = Math.max(0, Math.min(p.x - W * 0.4, this.map.width * TILE - W));
    this.camX += (targetCam - this.camX) * Math.min(1, dt * 8);
  }

  moveX(body, dx) {
    body.x += dx;
    const top = Math.floor(body.y / TILE);
    const bottom = Math.floor((body.y + body.h - 1) / TILE);
    if (dx > 0) {
      const col = Math.floor((body.x + body.w) / TILE);
      for (let r = top; r <= bottom; r++) {
        if (this.isSolid(col, r)) {
          body.x = col * TILE - body.w - 0.01;
          body.vx = 0;
          return true;
        }
      }
    } else if (dx < 0) {
      const col = Math.floor(body.x / TILE);
      for (let r = top; r <= bottom; r++) {
        if (this.isSolid(col, r)) {
          body.x = (col + 1) * TILE + 0.01;
          body.vx = 0;
          return true;
        }
      }
    }
    return false;
  }

  moveY(body, dy, prevBottom) {
    body.y += dy;
    const left = Math.floor(body.x / TILE);
    const right = Math.floor((body.x + body.w - 1) / TILE);
    if (dy > 0) {
      const row = Math.floor((body.y + body.h) / TILE);
      for (let c = left; c <= right; c++) {
        const oneWay = this.tileAt(c, row) === "-" && prevBottom <= row * TILE + 1;
        if (this.isSolid(c, row) || oneWay) {
          body.y = row * TILE - body.h;
          body.vy = 0;
          body.onGround = true;
          return;
        }
      }
    } else if (dy < 0) {
      const row = Math.floor(body.y / TILE);
      for (let c = left; c <= right; c++) {
        if (this.isSolid(c, row)) {
          body.y = (row + 1) * TILE;
          body.vy = 0;
          return;
        }
      }
    }
  }

  updateGhosts(dt) {
    const p = this.player;
    for (const g of this.ghosts) {
      if (g.dead) continue;
      const nextX = g.x + g.vx * dt;
      const frontCol = Math.floor((g.vx > 0 ? nextX + g.w : nextX) / TILE);
      const footRow = Math.floor((g.y + g.h + 2) / TILE);
      const bodyRow = Math.floor((g.y + g.h / 2) / TILE);
      if (this.isSolid(frontCol, bodyRow) || !this.isSolid(frontCol, footRow)) g.vx = -g.vx;
      else g.x = nextX;

      if (!overlap(p, g)) continue;
      const stomp = p.vy > 0 && p.y + p.h - g.y < 16;
      if (stomp) {
        g.dead = true;
        p.vy = -480;
        this.starCount += 1;
        this.burst(g.x + g.w / 2, g.y + g.h / 2, "#e8ecff", 14);
        this.sfx.play("stomp");
        this.emitHud();
      } else if (p.invuln <= 0) {
        p.vx = (p.x < g.x ? -1 : 1) * 280;
        p.vy = -320;
        this.hurt(false);
      }
    }
  }

  hurt(fell) {
    const p = this.player;
    this.hearts -= 1;
    this.sfx.play("hurt");
    if (this.hearts <= 0 || fell) {
      if (this.hearts <= 0) {
        this.hearts = MAX_HEARTS;
        this.starCount = Math.max(0, this.starCount - 5);
        this.hooks.onToast("Oh nein! Zurück zum letzten Zauber …");
      }
      p.x = this.checkpoint.x;
      p.y = this.checkpoint.y;
      p.vx = 0;
      p.vy = 0;
    }
    p.invuln = 1.5;
    this.emitHud();
  }

  collectStars() {
    const p = this.player;
    for (const s of this.stars) {
      if (s.taken) continue;
      if (Math.abs(p.x + p.w / 2 - s.x) < 18 && Math.abs(p.y + p.h / 2 - s.y) < 22) {
        s.taken = true;
        this.starCount += 1;
        this.burst(s.x, s.y, "#f5d36b", 6);
        this.sfx.play("star");
        this.emitHud();
      }
    }
  }

  checkTriggers() {
    const p = this.player;
    for (const tr of this.triggers) {
      if (tr.done) continue;
      const box = this.triggerBox(tr);
      if (!overlap(p, box)) continue;
      this.runTrigger(tr);
      return;
    }
  }

  triggerBox(tr) {
    const x = tr.col * TILE;
    const y = tr.row * TILE;
    if (tr.kind === "door") return { x: x - 3, y, w: TILE + 6, h: TILE * 2 };
    if (tr.kind === "sphinx") return { x: x - 3, y, w: TILE * 2 + 6, h: TILE * 3 };
    return { x: x + 4, y: y + 4, w: TILE - 8, h: TILE - 4 }; // book
  }

  async runTrigger(tr) {
    this.mode = "task";
    this.input.enabled = false;
    this.input.reset();
    const p = this.player;
    p.vx = 0;
    if (tr.kind !== "book") p.vy = Math.max(p.vy, 0);
    this.sfx.play("open");

    const results = await this.hooks.onTask(tr, (n) => { tr.solved = n; });
    tr.done = true;
    for (const r of results) {
      this.results.push(r);
      this.starCount += r.stars;
    }
    const cx = tr.col * TILE + (tr.kind === "sphinx" ? TILE : TILE / 2);
    const cy = tr.row * TILE + TILE / 2;
    this.burst(cx, cy, tr.kind === "book" ? "#f5d36b" : "#c08bff", 24);
    this.sfx.play("unlock");

    const groundY = (ROWS - 3) * TILE + (TILE - p.h);
    this.checkpoint = tr.kind === "book"
      ? { x: tr.col * TILE, y: groundY }
      : { x: (tr.col + (tr.kind === "sphinx" ? 3 : 2)) * TILE, y: groundY };

    this.mode = "play";
    this.input.enabled = true;
    this.emitHud();
  }

  checkFinish() {
    const f = this.map.finish;
    const box = { x: f.col * TILE + 4, y: f.row * TILE, w: TILE - 8, h: TILE * 2 };
    if (!overlap(this.player, box)) return;
    this.mode = "done";
    this.input.enabled = false;
    this.sfx.play("finish");
    const solvedIds = new Set(this.results.map((r) => r.taskId));
    this.hooks.onFinish({
      stars: this.starCount,
      results: this.results,
      skipped: this.triggers.filter((t) => !t.done).flatMap((t) => t.taskIds).filter((id) => !solvedIds.has(id)),
      seconds: Math.round((performance.now() - this.startedAt) / 1000),
    });
  }

  emitHud() {
    this.hooks.onHud({
      hearts: this.hearts,
      maxHearts: MAX_HEARTS,
      stars: this.starCount,
      done: this.results.length,
      total: this.taskCount,
    });
  }

  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 180;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: 0.7 + Math.random() * 0.4, color });
    }
  }

  updateParticles(dt) {
    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 500 * dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
  }

  // ---------- Render ----------

  render() {
    const ctx = this.ctx;
    if (!this.map) return;
    const t = this.time;
    const cam = Math.round(this.camX);
    drawBackground(ctx, this.theme, cam, t);

    ctx.save();
    ctx.translate(-cam, 0);

    const firstCol = Math.max(0, Math.floor(cam / TILE) - 1);
    const lastCol = Math.min(this.map.width - 1, Math.ceil((cam + W) / TILE) + 1);
    const outdoor = THEMES[this.theme].outdoor;

    for (const d of this.map.decorations) {
      if (d.col < firstCol - 2 || d.col > lastCol + 2) continue;
      const x = d.col * TILE;
      const y = d.row * TILE;
      if (d.kind === "torch") {
        if (outdoor) {
          ctx.fillStyle = "#2b2b3a";
          ctx.fillRect(x + 14, y + 10, 4, 22);
          drawTorch(ctx, x + 16, y - 2, t);
        } else drawTorch(ctx, x + 16, y + 10, t);
      } else if (d.kind === "portrait") drawPortrait(ctx, x - 1, y - 6, d.col);
      else if (d.kind === "window") drawWindow(ctx, x + 2, y, t);
      else if (d.kind === "cauldron") drawCauldron(ctx, x, y + 4, t);
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = firstCol; c <= lastCol; c++) {
        const ch = this.map.tiles[r][c];
        if (ch === " ") continue;
        let sprite;
        if (ch === "#") sprite = tileSprite(this.theme, this.map.tiles[r - 1]?.[c] === "#" ? "ground" : "ground-top");
        else if (ch === "=") sprite = tileSprite(this.theme, "block");
        else if (ch === "-") sprite = tileSprite(this.theme, "plank");
        if (sprite) ctx.drawImage(sprite, c * TILE, r * TILE);
      }
    }

    for (const s of this.stars) if (!s.taken) drawStar(ctx, s.x, s.y + Math.sin(t * 3 + s.x) * 2, t + s.x);

    for (const tr of this.triggers) {
      const x = tr.col * TILE;
      const y = tr.row * TILE;
      if (tr.kind === "door") drawDoor(ctx, x, y, tr.done, t);
      else if (tr.kind === "book" && !tr.done) {
        const bob = Math.sin(t * 3 + tr.col) * 4;
        ctx.fillStyle = "rgba(245,211,107,0.18)";
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2 + bob, 22 + Math.sin(t * 5) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(bookSprite(), x + 4, y + 5 + bob);
      } else if (tr.kind === "sphinx" && !tr.done) {
        drawSphinx(ctx, x, y, tr.solved, tr.taskIds.length, t);
      }
    }

    const f = this.map.finish;
    drawPortal(ctx, f.col * TILE, f.row * TILE, t);

    const ghost = ghostSprite();
    for (const g of this.ghosts) {
      if (g.dead) continue;
      const bob = Math.sin(t * 4 + g.phase) * 3;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.translate(g.x + g.w / 2, g.y + bob);
      if (g.vx > 0) ctx.scale(-1, 1);
      ctx.drawImage(ghost, -15, -2);
      ctx.restore();
    }

    this.drawPlayer(ctx);

    for (const pt of this.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, pt.life));
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawPlayer(ctx) {
    const p = this.player;
    if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0) return;
    let pose = "stand";
    if (!p.onGround) pose = "jump";
    else if (p.walkT > 0) pose = Math.floor(p.walkT * 10) % 2 ? "walk1" : "walk2";
    const sprite = characterFrame(this.character, pose);
    ctx.save();
    ctx.translate(Math.round(p.x + p.w / 2), Math.round(p.y - 4));
    if (p.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(sprite, -12, 0);
    if (this.mode === "play" && Math.random() < 0.15) {
      ctx.fillStyle = "#f5d36b";
      ctx.fillRect(11 + Math.random() * 4, 14 + Math.random() * 6, 2, 2); // wand sparkle
    }
    ctx.restore();
  }
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
