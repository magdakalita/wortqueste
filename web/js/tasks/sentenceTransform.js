import { el, compare } from "./util.js";

// { source: "Ich bin schüchtern. Trotzdem …", accepted: ["Obwohl ich …", …] }
export function render(task, body) {
  if (task.context) body.append(el("p", { class: "context", text: task.context }));
  body.append(el("p", { class: "sentence", text: task.source }));
  const input = el("textarea", { rows: "2", autocomplete: "off", spellcheck: "false", "aria-label": "Deine Antwort", style: "min-height: 70px" });
  body.append(input);

  return {
    focus: () => input.focus(),
    check() {
      if (!input.value.trim()) return { ok: false, incomplete: true, note: "Schreib bitte deinen Satz." };
      return compare(input.value, task.accepted);
    },
    reveal() {},
    solutionText: () => task.accepted[0],
    answerText: () => input.value.trim(),
  };
}
