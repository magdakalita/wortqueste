// Sends written answers to the teacher's Google Form (responses land in a Google Sheet).
// See README.md → "Odpowiedzi pisemne" for how to fill in this config.

export const FORM = {
  // e.g. "https://docs.google.com/forms/d/e/1FAIpQL.../formResponse"
  action: "",
  fields: {
    name: "",    // e.g. "entry.123456789"
    lektion: "",
    level: "",
    task: "",
    answer: "",
  },
};

const OUTBOX_KEY = "spiel.outbox";

function load() {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY)) ?? [];
  } catch {
    return [];
  }
}

function save(items) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(items.slice(-200)));
  } catch {
    // Storage is optional.
  }
}

export const isConfigured = () => Boolean(FORM.action && FORM.fields.answer);

async function post(entry) {
  const data = new URLSearchParams();
  const f = FORM.fields;
  if (f.name) data.set(f.name, entry.name);
  if (f.lektion) data.set(f.lektion, entry.lektion);
  if (f.level) data.set(f.level, String(entry.level));
  if (f.task) data.set(f.task, entry.task);
  data.set(f.answer, entry.answer);
  // Google Forms sends no CORS headers – an opaque response means the request went through.
  await fetch(FORM.action, { method: "POST", mode: "no-cors", body: data });
}

// Returns true if the answer was sent.
export async function submitAnswer(entry) {
  const items = load();
  const item = { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, sent: false };
  items.push(item);
  save(items);
  if (!isConfigured()) return false;
  try {
    await post(item);
    item.sent = true;
    save(items);
    return true;
  } catch {
    return false;
  }
}

// Retry answers that could not be sent earlier (e.g. offline).
export async function flushOutbox() {
  if (!isConfigured()) return;
  const items = load();
  for (const item of items.filter((i) => !i.sent)) {
    try {
      await post(item);
      item.sent = true;
    } catch {
      break;
    }
  }
  save(items);
}
