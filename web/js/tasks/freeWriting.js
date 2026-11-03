import { el, wordCount } from "./util.js";

// {
//   question: "…",
//   min_words: 15,
//   checklist: [{ text: "Benutze obwohl oder trotzdem.", pattern: "\\b(obwohl|trotzdem)\\b" }, …],
//   model_answer: "…"
// }
// There is no single correct answer: the student sees a checklist while writing,
// then a model answer. The text is sent to the teacher.
export function render(task, body) {
  if (task.context) body.append(el("p", { class: "context", text: task.context }));
  body.append(el("p", { class: "sentence", text: task.question }));
  const input = el("textarea", { spellcheck: "false", "aria-label": "Dein Text" });
  const counter = el("p", { class: "word-count" });
  const checks = (task.checklist ?? []).map((c) => ({ ...c, li: el("li", { text: c.text }) }));
  body.append(input, counter, el("ul", { class: "checklist" }, checks.map((c) => c.li)));

  const update = () => {
    const n = wordCount(input.value);
    counter.textContent = `${n} / ${task.min_words} Wörter`;
    for (const c of checks) {
      if (c.pattern) c.li.classList.toggle("done", new RegExp(c.pattern, "iu").test(input.value));
    }
  };
  input.addEventListener("input", update);
  update();

  return {
    freeWriting: true,
    focus: () => input.focus(),
    check() {
      const n = wordCount(input.value);
      if (n < task.min_words) {
        return { ok: false, incomplete: true, note: `Schreib bitte noch etwas mehr (mindestens ${task.min_words} Wörter).` };
      }
      const missing = checks.filter((c) => c.pattern && !new RegExp(c.pattern, "iu").test(input.value));
      return {
        ok: true,
        note: missing.length ? `Tipp für das nächste Mal: ${missing.map((c) => c.text).join(" ")}` : "Alle Punkte der Checkliste erfüllt!",
      };
    },
    reveal() {
      input.readOnly = true;
    },
    solutionText: () => task.model_answer,
    answerText: () => input.value.trim(),
  };
}
