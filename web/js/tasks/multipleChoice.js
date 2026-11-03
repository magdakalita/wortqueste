import { el, shuffle } from "./util.js";

// { question: "…", options: ["…", …], answer: 0 }  (answer = index of the correct option)
export function render(task, body) {
  if (task.context) body.append(el("p", { class: "context", text: task.context }));
  if (task.question) body.append(el("p", { class: "sentence", text: task.question }));
  const order = shuffle(task.options.map((_, i) => i));
  let selected = null;
  const buttons = new Map();
  const list = el("div", { class: "options" });
  for (const i of order) {
    const b = el("button", { class: "option", type: "button", text: task.options[i] });
    b.addEventListener("click", () => {
      selected = i;
      for (const [j, other] of buttons) {
        other.classList.toggle("selected", j === i);
        other.classList.remove("right", "wrong");
      }
    });
    buttons.set(i, b);
    list.append(b);
  }
  body.append(list);

  return {
    focus: () => buttons.get(order[0])?.focus(),
    check() {
      if (selected === null) return { ok: false, incomplete: true, note: "Wähle eine Antwort." };
      const ok = selected === task.answer;
      buttons.get(selected).classList.add(ok ? "right" : "wrong");
      return { ok };
    },
    reveal() {
      buttons.get(task.answer).classList.add("right");
    },
    solutionText: () => task.options[task.answer],
    answerText: () => (selected === null ? "" : task.options[selected]),
  };
}
