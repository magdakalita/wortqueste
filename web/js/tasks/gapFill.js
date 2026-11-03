import { el, shuffle, compare } from "./util.js";

// { text: "Ich möchte ein Risiko ___.", answers: [["eingehen"]], bank?: ["eingehen", "machen", …] }
export function render(task, body) {
  const parts = task.text.split("___");
  const inputs = [];
  let focused = null;

  const sentence = el("p", { class: "sentence" });
  parts.forEach((part, i) => {
    sentence.append(part);
    if (i < parts.length - 1) {
      const input = el("input", { type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: "false", "aria-label": `Lücke ${i + 1}` });
      input.addEventListener("focus", () => (focused = input));
      input.addEventListener("input", () => input.classList.remove("right", "wrong"));
      inputs.push(input);
      sentence.append(input);
    }
  });
  if (task.context) body.append(el("p", { class: "context", text: task.context }));
  body.append(sentence);

  if (task.bank?.length) {
    body.append(el("p", { class: "bank-label", text: "Wörter zur Auswahl:" }));
    const chips = el("div", { class: "chips" });
    for (const word of shuffle(task.bank)) {
      chips.append(el("button", {
        class: "chip",
        type: "button",
        text: word,
        onclick: () => {
          const target = focused && !focused.value ? focused : inputs.find((i) => !i.value) ?? focused ?? inputs[0];
          target.value = word;
          target.classList.remove("right", "wrong");
          const next = inputs.find((i) => !i.value);
          (next ?? target).focus();
        },
      }));
    }
    body.append(chips);
  }

  return {
    focus: () => inputs[0]?.focus(),
    check() {
      if (inputs.some((i) => !i.value.trim())) return { ok: false, incomplete: true, note: "Fülle bitte alle Lücken aus." };
      let ok = true;
      const notes = new Set();
      inputs.forEach((input, i) => {
        const r = compare(input.value, task.answers[i]);
        input.classList.toggle("right", r.ok);
        input.classList.toggle("wrong", !r.ok);
        if (!r.ok) ok = false;
        if (r.note) notes.add(r.note);
      });
      return { ok, note: [...notes].join(" ") };
    },
    reveal() {
      inputs.forEach((input, i) => {
        input.value = task.answers[i][0];
        input.classList.remove("wrong");
        input.classList.add("right");
      });
    },
    solutionText: () => parts.map((p, i) => p + (i < inputs.length ? task.answers[i][0] : "")).join(""),
    answerText: () => inputs.map((i) => i.value).join(" | "),
  };
}
