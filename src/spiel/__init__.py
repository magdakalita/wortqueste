"""Command line tools for the game: generate, validate and review lesson tasks."""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "web" / "data"


def _load(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def cmd_validate(args) -> int:
    from .validate import validate_lesson

    status = 0
    for path in args.files:
        errors = validate_lesson(_load(path))
        if errors:
            status = 1
            print(f"✗ {path}")
            for e in errors:
                print(f"  - {e}")
        else:
            print(f"✓ {path}")
    return status


def cmd_review(args) -> int:
    from .review import render_review

    text = render_review(_load(args.file))
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
        print(f"Saved {args.out}")
    else:
        print(text)
    return 0


def cmd_generate(args) -> int:
    from .generate import MEDIA_TYPES, generate_lesson, register_lesson
    from .review import render_review

    images = []
    for p in map(Path, args.images):
        images += sorted(f for f in p.iterdir() if f.suffix.lower() in MEDIA_TYPES) if p.is_dir() else [p]
    if not images:
        print("No images found.", file=sys.stderr)
        return 1
    lektion = args.lektion.zfill(2)
    out = DATA / f"lektion{lektion}.json"
    if out.exists() and not args.force:
        print(f"{out} already exists – use --force to overwrite.", file=sys.stderr)
        return 1

    print(f"Generating tasks for Lektion {lektion} from {len(images)} page(s) …")
    data = generate_lesson(images, lektion, args.title, DATA / "lektion06.json")
    title = args.title or data.get("title") or f"Lektion {lektion}"
    data["title"] = title
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    register_lesson(DATA / "lektionen.json", lektion, title, out.name)
    review = ROOT / f"zadania_lektion{lektion}.md"
    review.write_text(render_review(data), encoding="utf-8")
    print(f"Saved {out} ({len(data['tasks'])} tasks) and the review list {review.name}.")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(prog="spiel", description="Tasks for the Schloss Sprachenstein game.")
    sub = parser.add_subparsers(required=True)

    p = sub.add_parser("generate", help="generate tasks from textbook pages (needs Claude API access)")
    p.add_argument("images", nargs="+", help="image files or folders with the lesson pages")
    p.add_argument("--lektion", required=True, help="lesson number, e.g. 7")
    p.add_argument("--title", help="lesson title, e.g. „Ich war so aufgeregt!“")
    p.add_argument("--force", action="store_true", help="overwrite an existing lesson file")
    p.set_defaults(func=cmd_generate)

    p = sub.add_parser("validate", help="check lesson files")
    p.add_argument("files", nargs="*", default=[str(f) for f in sorted(DATA.glob("lektion[0-9]*.json"))])
    p.set_defaults(func=cmd_validate)

    p = sub.add_parser("review", help="print a lesson as a readable list with solutions")
    p.add_argument("file")
    p.add_argument("--out", help="save to a Markdown file")
    p.set_defaults(func=cmd_review)

    args = parser.parse_args()
    sys.exit(args.func(args))
