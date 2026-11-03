import { Game } from "./engine/game.js";
import { Input } from "./engine/input.js";
import { Sfx } from "./engine/sfx.js";
import { LEVELS } from "./levels/levels.js";
import { buildLevel } from "./levels/builder.js";
import { CHARACTERS, drawCharacterPreview } from "./sprites.js";
import { openTasks } from "./tasks/modal.js";
import { el } from "./tasks/util.js";
import { loadProgress, saveProgress, lektionProgress } from "./storage.js";
import { submitAnswer, flushOutbox, isConfigured } from "./submit.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const UNLOCK_ALL = params.has("alle");

const input = new Input();
const sfx = new Sfx();
const progress = loadProgress();
let lektionen = [];
let lektion = null; // { id, title, tasks }
let currentLevel = null;
let written = [];
let toastTimer = null;

const game = new Game($("game"), input, sfx, {
  onTask: runTasks,
  onFinish: showSummary,
  onHud: updateHud,
  onToast: toast,
});
if (params.has("debug")) window.spiel = { game, startLevel: (n) => startLevel(n) };

// ---------- Boot ----------

async function boot() {
  input.bindTouch($("touch"));
  lektionen = await fetchJson("data/lektionen.json");
  const select = $("lektion-select");
  for (const l of lektionen) select.append(el("option", { value: l.id, text: `Lektion ${l.id} – ${l.title}` }));
  const wanted = params.get("lektion") ?? progress.lastLektion ?? lektionen.at(-1).id;
  select.value = lektionen.some((l) => l.id === wanted) ? wanted : lektionen.at(-1).id;
  select.addEventListener("change", () => selectLektion(select.value));

  $("player-name").value = progress.name;
  $("player-name").addEventListener("input", (e) => {
    progress.name = e.target.value.trim();
    saveProgress(progress);
  });

  renderCharacters();
  await selectLektion(select.value);
  wireButtons();
  flushOutbox();
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

async function selectLektion(id) {
  const meta = lektionen.find((l) => l.id === id);
  const data = await fetchJson(`data/${meta.file}`);
  lektion = { id, title: meta.title, tasks: data.tasks };
  progress.lastLektion = id;
  saveProgress(progress);
  renderLevels();
}

// ---------- Menu ----------

function renderCharacters() {
  const box = $("characters");
  box.replaceChildren();
  for (const ch of CHARACTERS) {
    const canvas = el("canvas", { width: "24", height: "32" });
    drawCharacterPreview(canvas, ch);
    const card = el("button", { class: "card", type: "button" }, canvas, el("div", { class: "name", text: ch.name }), el("div", { class: "house", text: ch.house }));
    card.classList.toggle("selected", progress.character === ch.id);
    card.addEventListener("click", () => {
      progress.character = ch.id;
      saveProgress(progress);
      renderCharacters();
    });
    box.append(card);
  }
}

function renderLevels() {
  const box = $("levels");
  box.replaceChildren();
  const lp = lektionProgress(progress, lektion.id);
  for (const def of LEVELS) {
    const count = lektion.tasks.filter((t) => t.level === def.n).length;
    const locked = !UNLOCK_ALL && def.n > lp.unlocked;
    const best = lp.best[def.n];
    const card = el("button", { class: `card${locked ? " locked" : ""}`, type: "button" },
      el("div", { class: "num", text: `Level ${def.n}${locked ? " 🔒" : ""}` }),
      el("div", { class: "title", text: def.title }),
      el("div", { class: "topic", text: `${def.topic} · ${count} Aufgaben` }),
      best !== undefined ? el("div", { class: "best", text: `★ ${best}` }) : null,
    );
    card.disabled = locked || count === 0;
    card.addEventListener("click", () => startLevel(def.n));
    box.append(card);
  }
}

function wireButtons() {
  $("btn-pause").addEventListener("click", () => setPause(true));
  $("pause-resume").addEventListener("click", () => setPause(false));
  $("pause-menu").addEventListener("click", backToMenu);
  $("summary-menu").addEventListener("click", backToMenu);
  $("summary-next").addEventListener("click", () => {
    if (currentLevel < LEVELS.length) startLevel(currentLevel + 1);
    else backToMenu();
  });
  $("btn-sound").addEventListener("click", (e) => {
    sfx.muted = !sfx.muted;
    e.currentTarget.classList.toggle("off", sfx.muted);
  });
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || currentLevel === null) return;
    if (!$("pause").hidden) setPause(false);
    else if (game.mode === "play") setPause(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game.mode === "play") setPause(true);
  });
}

// ---------- Playing ----------

function startLevel(n) {
  if (!progress.name) {
    $("player-name").focus();
    $("player-name").placeholder = "Bitte zuerst deinen Namen eingeben!";
    return;
  }
  const def = LEVELS.find((l) => l.n === n);
  const tasks = lektion.tasks.filter((t) => t.level === n);
  const character = CHARACTERS.find((c) => c.id === progress.character) ?? CHARACTERS[0];
  currentLevel = n;
  written = [];
  game.load(def, buildLevel(def, tasks), character, tasks.length);
  for (const id of ["menu", "summary", "pause", "task"]) $(id).hidden = true;
  $("hud").hidden = false;
  $("hud-level").textContent = `Level ${n} · ${def.title}`;
  $("touch").hidden = !matchMedia("(pointer: coarse)").matches;
  input.enabled = true;
  game.start();
  toast(`${def.title} – ${def.topic}`);
}

function setPause(paused) {
  game.setPaused(paused);
  $("pause").hidden = !paused || game.mode !== "pause";
}

function backToMenu() {
  game.stop();
  game.mode = "idle";
  input.enabled = false;
  currentLevel = null;
  for (const id of ["summary", "pause", "task", "hud", "touch"]) $(id).hidden = true;
  $("menu").hidden = false;
  renderLevels();
}

async function runTasks(trigger, onProgress) {
  const tasks = trigger.taskIds.map((id) => lektion.tasks.find((t) => t.id === id));
  const allTasks = lektion.tasks.filter((t) => t.level === currentLevel);
  const label = (i) => {
    if (trigger.kind === "sphinx") return `Die Sphinx fragt · Frage ${i + 1} von ${tasks.length}`;
    const pos = allTasks.indexOf(tasks[i]) + 1;
    if (trigger.kind === "book") return `Zauberbuch (Bonus) · Aufgabe ${pos} von ${allTasks.length}`;
    return `Zaubertür · Aufgabe ${pos} von ${allTasks.length}`;
  };
  if (trigger.kind === "sphinx") {
    toast("Die Sphinx: „Beantworte meine Fragen, dann darfst du vorbei!“");
    await new Promise((r) => setTimeout(r, 1200));
  }
  return openTasks(tasks, { label, onProgress, onWritten, sfx });
}

function onWritten(result) {
  const entry = { question: `${result.instruction} ${result.question}`.trim(), answer: result.answer, status: "…" };
  written.push(entry);
  submitAnswer({
    name: progress.name,
    lektion: lektion.id,
    level: currentLevel,
    task: entry.question,
    answer: result.answer,
  }).then((sent) => {
    entry.status = sent ? "an die Lehrerin geschickt ✓" : isConfigured() ? "wird später geschickt" : "gespeichert";
  });
}

function updateHud(s) {
  $("hud-hearts").textContent = "♥".repeat(s.hearts) + "♡".repeat(s.maxHearts - s.hearts);
  $("hud-stars").textContent = `★ ${s.stars}`;
  $("hud-tasks").textContent = `✦ ${s.done}/${s.total}`;
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2800);
}

// ---------- Summary ----------

function showSummary(stats) {
  const lp = lektionProgress(progress, lektion.id);
  lp.unlocked = Math.max(lp.unlocked, currentLevel + 1);
  lp.best[currentLevel] = Math.max(lp.best[currentLevel] ?? 0, stats.stars);
  saveProgress(progress);

  const total = lektion.tasks.filter((t) => t.level === currentLevel).length;
  const firstTry = stats.results.filter((r) => r.firstTry).length;
  const mm = Math.floor(stats.seconds / 60);
  const ss = String(stats.seconds % 60).padStart(2, "0");
  const last = currentLevel >= LEVELS.length;

  $("summary-title").textContent = last ? `Lektion ${lektion.id} geschafft! 🎓` : `Level ${currentLevel} geschafft!`;
  const stat = (value, label) => el("div", { class: "stat" }, el("div", { class: "value", text: value }), el("div", { class: "label", text: label }));
  $("summary-stats").replaceChildren(
    stat(`★ ${stats.stars}`, "Sterne"),
    stat(`${firstTry}/${total}`, "beim ersten Versuch richtig"),
    stat(`${mm}:${ss}`, "Zeit"),
    ...(stats.skipped.length ? [stat(String(stats.skipped.length), "Zauberbücher verpasst")] : []),
  );

  const box = $("summary-writing");
  box.replaceChildren();
  if (written.length) {
    box.append(el("h2", { text: "Deine Texte" }));
    for (const w of written) {
      box.append(el("div", { class: "writing-entry" },
        el("div", { class: "q", text: w.question }),
        el("div", { text: w.answer }),
        el("div", { class: "send-status", text: w.status }),
      ));
    }
    const copy = el("button", { class: "btn", type: "button", text: "Texte kopieren" });
    copy.addEventListener("click", async () => {
      const text = `${progress.name} – Lektion ${lektion.id}, Level ${currentLevel}\n\n` + written.map((w) => `${w.question}\n${w.answer}`).join("\n\n");
      try {
        await navigator.clipboard.writeText(text);
        copy.textContent = "Kopiert ✓";
      } catch {
        copy.textContent = "Kopieren nicht möglich";
      }
    });
    box.append(copy);
  }

  $("summary-next").textContent = last ? "Zum Menü" : "Nächstes Level ➜";
  $("hud").hidden = true;
  $("touch").hidden = true;
  $("summary").hidden = false;
}

boot().catch((err) => {
  console.error(err);
  document.body.append(el("p", { style: "color:#fff;padding:20px", text: `Fehler beim Laden: ${err.message}` }));
});
