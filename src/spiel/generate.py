"""Generates the tasks for a new lesson from photos/screenshots of the textbook pages (Claude API)."""

import base64
import json
import re
from pathlib import Path

import anthropic

from .validate import validate_lesson

MODEL = "claude-opus-5-5"
MEDIA_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif"}

SYSTEM = """\
Du bist eine erfahrene DaF-Lehrerin und erstellst Übungen für ein Lernspiel (Jump'n'Run im Stil einer Zauberschule).
Die Schülerin lernt Deutsch auf Niveau B1. Ihre Muttersprache ist Polnisch.

Du bekommst die Seiten einer Lektion aus dem Lehrbuch. Erstelle daraus Aufgaben für vier Level mit steigender Schwierigkeit:
- Level 1 „Der Schlossgarten“: Wortschatz der Lektion (Kollokationen, Bedeutungen, Verben mit Präpositionen). 9–11 Aufgaben.
- Level 2 „Die Bibliothek“: Redemittel und Satzbau (Wortstellung, typische Ausdrücke der Lektion). 9–11 Aufgaben.
- Level 3 „Der Zaubertrank-Keller“: die Grammatik der Lektion – erst erkennen, dann selbst bilden und umformen. 9–11 Aufgaben.
- Level 4 „Der Astronomieturm“: Wiederholung auf höherem Niveau, Leseverstehen zu den Texten der Lektion und am Ende freies Schreiben. 7–9 Aufgaben; die letzten zwei Aufgaben stellt eine Sphinx und sind vom Typ free_writing.

Regeln:
- Bleib beim Wortschatz, bei den Themen und bei der Grammatik dieser Lektion. Personen und Situationen aus der Lektion sind willkommen, aber erfinde keine Fakten über sie, die nicht im Buch stehen.
- Alle Anweisungen, Tipps und Erklärungen auf Deutsch, kurz und auf B1-Niveau.
- Jede Aufgabe muss eindeutig lösbar sein. Bei gap_fill, word_order und sentence_transform: gib ALLE korrekten Varianten an (auch andere Wortstellungen), damit richtige Antworten nicht als falsch gewertet werden. Bei match_pairs dürfen keine zwei Zuordnungen gleichzeitig sinnvoll sein.
- Mische die Aufgabentypen innerhalb jedes Levels.
- Kopiere keine langen Textpassagen aus dem Buch; kurze Zitate (1–2 Sätze) sind in Ordnung.

Aufgabentypen (Felder zusätzlich zu id, level, type, instruction, hint, explanation; optional überall: context):
- gap_fill: text mit "___" für jede Lücke, answers = Liste pro Lücke mit allen akzeptierten Lösungen, optional bank = Wortbank (enthält die erste Lösung jeder Lücke + 2–3 Distraktoren).
- word_order: words = die Wörter in korrekter Reihenfolge (Satzzeichen hängen am Wort), optional accepted = weitere korrekte Sätze aus genau denselben Wörtern.
- match_pairs: pairs = 4–6 Paare [links, rechts], alle Einträge einzigartig.
- multiple_choice: optional question, options = 3–4 Antworten, answer = Index der richtigen Antwort.
- sentence_transform: source = Ausgangssatz, accepted = alle korrekten Umformungen.
- free_writing: question, min_words, checklist = [{text, pattern}] (pattern = regulärer Ausdruck ohne \\b, der in einer guten Antwort vorkommt; die model_answer muss alle patterns erfüllen), model_answer. Kein hint nötig.

IDs: "L<level>-<laufende Nummer zweistellig>", z. B. "L2-07".
Antworte ausschließlich mit dem JSON-Objekt (keine Erklärungen davor oder danach) im Format:
{"lektion": "...", "title": "...", "tasks": [...]}
"""


def _image_block(path: Path) -> dict:
    media_type = MEDIA_TYPES.get(path.suffix.lower())
    if not media_type:
        raise ValueError(f"Unsupported image type: {path}")
    data = base64.standard_b64encode(path.read_bytes()).decode("utf-8")
    return {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": data}}


def _extract_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < 0:
        raise ValueError("The response contains no JSON object.")
    return json.loads(text[start : end + 1])


def _ask(client: anthropic.Anthropic, messages: list[dict]):
    with client.beta.messages.stream(
        model=MODEL,
        max_tokens=64000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        output_config={"effort": "high"},
        system=SYSTEM,
        messages=messages,
    ) as stream:
        response = stream.get_final_message()
    if response.stop_reason == "refusal":
        raise RuntimeError(f"The model declined the request: {response.stop_details}")
    if response.stop_reason == "max_tokens":
        raise RuntimeError("The response was cut off (max_tokens). Try fewer pages at once.")
    return response


def generate_lesson(images: list[Path], lektion: str, title: str | None, example: Path | None) -> dict:
    client = anthropic.Anthropic()
    content: list[dict] = [_image_block(p) for p in images]
    request = f"Erstelle die Aufgaben für Lektion {lektion}."
    if title:
        request += f" Der Titel der Lektion ist „{title}“."
    if example and example.exists():
        request += (
            "\n\nSo sieht eine fertige Datei für eine andere Lektion aus – orientiere dich an Umfang, Stil und Format, "
            f"aber nicht am Inhalt:\n\n{example.read_text(encoding='utf-8')}"
        )
    content.append({"type": "text", "text": request})
    messages = [{"role": "user", "content": content}]

    for attempt in range(3):
        response = _ask(client, messages)
        text = "".join(b.text for b in response.content if b.type == "text")
        try:
            data = _extract_json(text)
            errors = validate_lesson(data)
        except (ValueError, json.JSONDecodeError) as e:
            errors = [f"invalid JSON: {e}"]
        if not errors:
            data["lektion"] = lektion
            return data
        print(f"Attempt {attempt + 1}: {len(errors)} problem(s) – asking for a corrected version.")
        messages.append({"role": "assistant", "content": response.content})
        messages.append({
            "role": "user",
            "content": "Die Datei hat diese Fehler. Bitte schick die vollständige, korrigierte JSON-Datei:\n- " + "\n- ".join(errors),
        })
    raise RuntimeError("Could not produce a valid lesson file:\n- " + "\n- ".join(errors))


def register_lesson(registry: Path, lektion: str, title: str, file_name: str) -> None:
    entries = json.loads(registry.read_text(encoding="utf-8")) if registry.exists() else []
    entries = [e for e in entries if e["id"] != lektion]
    entries.append({"id": lektion, "title": title, "file": file_name})
    entries.sort(key=lambda e: e["id"])
    registry.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
