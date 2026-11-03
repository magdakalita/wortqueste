import { el } from "./util.js";
import * as gapFill from "./gapFill.js";
import * as wordOrder from "./wordOrder.js";
import * as matchPairs from "./matchPairs.js";
import * as multipleChoice from "./multipleChoice.js";
import * as sentenceTransform from "./sentenceTransform.js";
import * as freeWriting from "./freeWriting.js";

const TYPES = {
  gap_fill: gapFill,
  word_order: wordOrder,
  match_pairs: matchPairs,
  multiple_choice: multipleChoice,
  sentence_transform: sentenceTransform,
  free_writing: freeWriting,
};

const PRAISE = ["Richtig!", "Super!", "Ausgezeichnet!", "Zauberhaft!", "Genau!", "Perfekt!"];

const $ = (id) => document.getElementById(id);

// Shows tasks one after another. Resolves with one result per task.
// opts: { label(i) -> string, onProgress(n), onWritten(result), sfx }
export function openTasks(tasks, opts) {
  const screen = $("task");
  const body = $("task-body");
  const feedback = $("task-feedback");
  const checkBtn = $("task-check");
  const nextBtn = $("task-next");
  const results = [];

  return new Promise((resolve) => {
    let index = -1;
    let ui;
    let attempts;
    let task;

    function showNext() {
      index += 1;
      if (index >= tasks.length) {
        screen.hidden = true;
        document.removeEventListener("keydown", onKey);
        resolve(results);
        return;
      }
      task = tasks[index];
      attempts = 0;
      $("task-meta").textContent = opts.label(index);
      $("task-instruction").textContent = task.instruction;
      body.replaceChildren();
      feedback.hidden = true;
      feedback.className = "feedback";
      checkBtn.hidden = false;
      checkBtn.disabled = false;
      nextBtn.hidden = true;
      ui = TYPES[task.type].render(task, body);
      screen.hidden = false;
      screen.scrollTop = 0;
      setTimeout(() => ui.focus?.(), 50);
    }

    function showFeedback(kind, ...content) {
      feedback.hidden = false;
      feedback.className = `feedback ${kind}`;
      feedback.replaceChildren(...content.filter(Boolean));
    }

    function finish(ok) {
      const firstTry = ok && attempts === 1;
      const result = {
        taskId: task.id,
        level: task.level,
        type: task.type,
        instruction: task.instruction,
        question: task.question ?? task.source ?? task.text ?? "",
        answer: ui.answerText(),
        attempts,
        firstTry: ui.freeWriting ? true : firstTry,
        stars: ui.freeWriting ? 3 : firstTry ? 3 : ok ? 1 : 0,
        freeWriting: !!ui.freeWriting,
      };
      results.push(result);
      opts.onProgress?.(results.length);
      if (ui.freeWriting) opts.onWritten?.(result);
      checkBtn.hidden = true;
      nextBtn.hidden = false;
      nextBtn.focus();
    }

    function onCheck() {
      const r = ui.check();
      if (r.incomplete) {
        showFeedback("", r.note);
        return;
      }
      attempts += 1;
      const explanation = task.explanation ? el("p", { text: task.explanation }) : null;
      const note = r.note ? el("p", { text: r.note }) : null;

      if (r.ok && ui.freeWriting) {
        opts.sfx.play("right");
        ui.reveal();
        showFeedback("right",
          el("strong", { text: "Danke! Dein Text geht an deine Lehrerin. ✉" }),
          note,
          el("p", { text: "So könnte eine Antwort aussehen:" }),
          el("p", { class: "model-answer", text: task.model_answer }),
        );
        finish(true);
      } else if (r.ok) {
        opts.sfx.play("right");
        showFeedback("right", el("strong", { text: `${PRAISE[Math.floor(Math.random() * PRAISE.length)]} ✨` }), note, explanation);
        finish(true);
      } else if (attempts === 1) {
        opts.sfx.play("wrong");
        showFeedback("wrong",
          el("strong", { text: "Noch nicht ganz – versuch es noch einmal!" }),
          task.hint ? el("p", { text: `Tipp: ${task.hint}` }) : null,
        );
      } else {
        opts.sfx.play("wrong");
        ui.reveal();
        showFeedback("wrong",
          el("strong", { text: "Schade! Die richtige Lösung ist:" }),
          el("p", { class: "solution", text: ui.solutionText() }),
          explanation,
        );
        finish(false);
      }
    }

    function onKey(e) {
      if (e.key !== "Enter") return;
      if (e.target.tagName === "TEXTAREA" && !(e.ctrlKey || e.metaKey)) return;
      if (e.target.tagName === "BUTTON" && e.target !== nextBtn && e.target !== checkBtn) return;
      e.preventDefault();
      if (!nextBtn.hidden) nextBtn.click();
      else if (!checkBtn.hidden) checkBtn.click();
    }

    checkBtn.onclick = onCheck;
    nextBtn.onclick = showNext;
    document.addEventListener("keydown", onKey);
    showNext();
  });
}

export function isKnownType(type) {
  return type in TYPES;
}
