"""Checks that a lesson file (web/data/lektionNN.json) is complete and every task is solvable."""

import re
from collections import Counter

LEVELS = (1, 2, 3, 4)
BOSS_TASKS = 2  # level 4 ends with the sphinx asking this many tasks
TYPES = {"gap_fill", "word_order", "match_pairs", "multiple_choice", "sentence_transform", "free_writing"}


def _is_str_list(value, min_len=1):
    return isinstance(value, list) and len(value) >= min_len and all(isinstance(v, str) and v.strip() for v in value)


def validate_task(t: dict) -> list[str]:
    tid = t.get("id", "?")
    errors = []

    def err(msg):
        errors.append(f"{tid}: {msg}")

    if t.get("level") not in LEVELS:
        err(f"level must be one of {LEVELS}")
    kind = t.get("type")
    if kind not in TYPES:
        err(f"unknown type {kind!r}")
        return errors
    if not isinstance(t.get("instruction"), str) or not t["instruction"].strip():
        err("missing instruction")

    if kind == "gap_fill":
        text = t.get("text", "")
        gaps = text.count("___")
        answers = t.get("answers")
        if gaps == 0:
            err("text has no ___ gap")
        if not isinstance(answers, list) or len(answers) != gaps or not all(_is_str_list(a) for a in answers):
            err(f"answers must be a list of {gaps} non-empty lists of strings")
        elif t.get("bank") is not None:
            if not _is_str_list(t["bank"], 2):
                err("bank must list at least 2 words")
            else:
                missing = [a[0] for a in answers if a[0] not in t["bank"]]
                if missing:
                    err(f"bank is missing the answers {missing}")
    elif kind == "word_order":
        if not _is_str_list(t.get("words"), 3):
            err("words must list at least 3 words")
        elif "accepted" in t:
            if not _is_str_list(t["accepted"]):
                err("accepted must be a list of strings")
            else:
                chips = Counter(w.lower().strip(".,!?") for w in t["words"])
                for a in t["accepted"]:
                    if Counter(w.lower().strip(".,!?") for w in a.split()) != chips:
                        err(f"accepted variant does not use exactly the given words: {a!r}")
    elif kind == "match_pairs":
        pairs = t.get("pairs")
        if not isinstance(pairs, list) or len(pairs) < 3 or not all(_is_str_list(p, 2) and len(p) == 2 for p in pairs):
            err("pairs must be a list of at least 3 [left, right] pairs")
        else:
            for side, name in ((0, "left"), (1, "right")):
                values = [p[side] for p in pairs]
                if len(set(values)) != len(values):
                    err(f"{name} items must be unique")
    elif kind == "multiple_choice":
        options = t.get("options")
        if not _is_str_list(options, 2):
            err("options must list at least 2 answers")
        elif not isinstance(t.get("answer"), int) or not 0 <= t["answer"] < len(options):
            err("answer must be the index of the correct option")
        elif len(set(options)) != len(options):
            err("options must be unique")
    elif kind == "sentence_transform":
        if not isinstance(t.get("source"), str) or not t["source"].strip():
            err("missing source sentence")
        if not _is_str_list(t.get("accepted")):
            err("accepted must list at least one correct sentence")
    elif kind == "free_writing":
        if not isinstance(t.get("question"), str) or not t["question"].strip():
            err("missing question")
        if not isinstance(t.get("min_words"), int) or t["min_words"] < 1:
            err("min_words must be a positive integer")
        if not isinstance(t.get("model_answer"), str) or not t["model_answer"].strip():
            err("missing model_answer")
        for c in t.get("checklist", []):
            if not isinstance(c, dict) or not isinstance(c.get("text"), str):
                err("checklist items need a text")
                continue
            if c.get("pattern"):
                try:
                    if not re.search(c["pattern"], t.get("model_answer", ""), re.IGNORECASE):
                        err(f"model_answer does not satisfy checklist pattern {c['pattern']!r}")
                except re.error as e:
                    err(f"invalid checklist pattern {c['pattern']!r}: {e}")

    if kind != "free_writing" and not t.get("hint"):
        err("missing hint")
    return errors


def validate_lesson(data: dict) -> list[str]:
    errors = []
    tasks = data.get("tasks")
    if not isinstance(tasks, list) or not tasks:
        return ["file has no tasks"]
    ids = [t.get("id") for t in tasks]
    dupes = [i for i, n in Counter(ids).items() if n > 1]
    if dupes:
        errors.append(f"duplicate task ids: {dupes}")
    for t in tasks:
        errors.extend(validate_task(t))
    for level in LEVELS:
        n = sum(1 for t in tasks if t.get("level") == level)
        if not 6 <= n <= 14:
            errors.append(f"level {level} has {n} tasks (expected 6–14)")
    boss = [t for t in tasks if t.get("level") == 4][-BOSS_TASKS:]
    if any(t.get("type") != "free_writing" for t in boss):
        errors.append(f"the last {BOSS_TASKS} tasks of level 4 (the sphinx) should be free_writing")
    return errors
