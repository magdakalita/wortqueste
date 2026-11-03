"""Renders a lesson file as a readable Markdown list of tasks with solutions – for the teacher to review."""

LEVEL_NAMES = {
    1: "Level 1 – Der Schlossgarten (Wortschatz)",
    2: "Level 2 – Die Bibliothek (Redemittel & Satzbau)",
    3: "Level 3 – Der Zaubertrank-Keller (Grammatik)",
    4: "Level 4 – Der Astronomieturm (Schreiben & Wiederholung)",
}

TYPE_NAMES = {
    "gap_fill": "uzupełnij lukę",
    "word_order": "ułóż wyrazy",
    "match_pairs": "dopasuj pary",
    "multiple_choice": "wybierz odpowiedź",
    "sentence_transform": "przekształć zdanie",
    "free_writing": "odpowiedź pisemna",
}


def _task_md(t: dict) -> list[str]:
    out = [f"### {t['id']} · {TYPE_NAMES.get(t['type'], t['type'])}", "", f"**{t['instruction']}**", ""]
    if t.get("context"):
        out += [f"> {t['context']}", ""]
    kind = t["type"]
    if kind == "gap_fill":
        filled = t["text"]
        for answers in t["answers"]:
            filled = filled.replace("___", f"**[{' / '.join(answers)}]**", 1)
        out.append(filled)
        if t.get("bank"):
            out.append(f"\nBank słów: {', '.join(t['bank'])}")
    elif kind == "word_order":
        out.append(f"Rozwiązanie: **{' '.join(t['words'])}**")
        for a in t.get("accepted", []):
            out.append(f"- też akceptowane: {a}")
    elif kind == "match_pairs":
        out += [f"- {left} → **{right}**" for left, right in t["pairs"]]
    elif kind == "multiple_choice":
        if t.get("question"):
            out += [t["question"], ""]
        out += [f"- {'**✓ ' + o + '**' if i == t['answer'] else o}" for i, o in enumerate(t["options"])]
    elif kind == "sentence_transform":
        out += [f"Zdanie: {t['source']}", "", "Akceptowane odpowiedzi:"]
        out += [f"- {a}" for a in t["accepted"]]
    elif kind == "free_writing":
        out += [t["question"], "", f"Minimum słów: {t['min_words']}", "", "Checklista:"]
        out += [f"- {c['text']}" for c in t.get("checklist", [])]
        out += ["", f"Wzorcowa odpowiedź: *{t['model_answer']}*"]
    if t.get("hint"):
        out.append(f"\nPodpowiedź: {t['hint']}")
    if t.get("explanation"):
        out.append(f"Wyjaśnienie: {t['explanation']}")
    return out + [""]


def render_review(data: dict) -> str:
    lines = [f"# Lektion {data.get('lektion', '?')} – {data.get('title', '')}", "", "Zadania do przejrzenia przed udostępnieniem gry.", ""]
    for level, name in LEVEL_NAMES.items():
        tasks = [t for t in data["tasks"] if t.get("level") == level]
        lines += [f"## {name} ({len(tasks)} zadań)", ""]
        for t in tasks:
            lines += _task_md(t)
    return "\n".join(lines)
