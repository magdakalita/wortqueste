export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}

export function shuffle(arr, avoidOriginal = false) {
  const a = [...arr];
  for (let tries = 0; tries < 10; tries++) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (!avoidOriginal || a.length < 2 || a.some((x, i) => x !== arr[i])) break;
  }
  return a;
}

// Normalize typography so that only the language matters.
export function normalize(s) {
  return String(s)
    .replace(/[„“”"]/g, '"')
    .replace(/[‚‘’`´]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim()
    .replace(/[.!?]+$/, "")
    .trim();
}

const stripCommas = (s) => s.replace(/,/g, "").replace(/\s+/g, " ");

// Compare an answer against the accepted solutions.
// Returns { ok, note } – small slips (capitalization, a missing comma) are accepted with a note.
export function compare(answer, accepted) {
  const a = normalize(answer);
  if (!a) return { ok: false };
  const list = accepted.map(normalize);
  if (list.includes(a)) return { ok: true };
  if (list.some((s) => s.toLowerCase() === a.toLowerCase())) {
    return { ok: true, note: "Achte auf die Groß- und Kleinschreibung!" };
  }
  if (list.some((s) => stripCommas(s).toLowerCase() === stripCommas(a).toLowerCase())) {
    return { ok: true, note: "Fast perfekt – vergiss das Komma nicht!" };
  }
  return { ok: false };
}

export function wordCount(text) {
  return (text.trim().match(/[\p{L}\p{N}]+/gu) || []).length;
}
