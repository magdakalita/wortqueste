// Player progress in localStorage. Every access is guarded – the game also works without storage.

const KEY = "spiel.progress";

export function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY));
    if (p && typeof p === "object") return { name: "", character: "mila", lektionen: {}, ...p };
  } catch {
    // ignore
  }
  return { name: "", character: "mila", lektionen: {} };
}

export function saveProgress(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function lektionProgress(p, id) {
  p.lektionen[id] ??= { unlocked: 1, best: {} };
  return p.lektionen[id];
}
