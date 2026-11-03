import { el, shuffle, compare } from "./util.js";

// { words: ["Ich", "möchte", …] (in the correct order), accepted?: ["other correct orders"], context? }
export function render(task, body) {
  const solution = task.words.join(" ");
  const accepted = [solution, ...(task.accepted ?? [])];

  if (task.context) body.append(el("p", { class: "context", text: task.context }));
  const line = el("div", { class: "chips answer-line" });
  const bank = el("div", { class: "chips" });
  body.append(line, bank);

  const chips = shuffle(task.words, true).map((word) => {
    const chip = el("button", { class: "chip", type: "button", text: word });
    chip.addEventListener("click", () => {
      (chip.parentElement === bank ? line : bank).append(chip);
      line.classList.remove("wrong");
    });
    return chip;
  });
  bank.append(...chips);

  const current = () => [...line.children].map((c) => c.textContent).join(" ");

  return {
    focus: () => chips[0]?.focus(),
    check() {
      if (bank.children.length) return { ok: false, incomplete: true, note: "Benutze alle Wörter." };
      return compare(current(), accepted);
    },
    reveal() {
      line.replaceChildren(...task.words.map((w) => el("span", { class: "chip", text: w })));
      bank.replaceChildren();
    },
    solutionText: () => solution,
    answerText: current,
  };
}
