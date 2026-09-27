#!/usr/bin/env python
"""
Commit gates, run by git itself, so every agent's commit passes them (Claude, Codex, agy, a
person). Installed by `devflow add-gates`; settings live in .claude/gates.json.

  python .claude/hooks/commit_gates.py pre-commit          staged lines and files
  python .claude/hooks/commit_gates.py commit-msg <file>   the commit message

pre-commit checks, in order (cheapest first, all failures reported together):
  1. No em-dash or en-dash in any added line (Joe's global rule).
  2. No secrets: key-shaped strings in added lines, or key files like .env being staged.
  3. ban_scan.py on staged design files (.claude/ui-ux/, .claude/DESIGN.md).
  4. The fast test command, when one is set.
commit-msg checks: no em-dash or en-dash in the message.

Exit 1 blocks the commit. Standard library only.
"""

import fnmatch
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

DASHES = {chr(0x2014): "em-dash", chr(0x2013): "en-dash"}

SECRET_PATTERNS = [
    ("Anthropic API key", re.compile(r"sk-ant-[A-Za-z0-9_\-]{20,}")),
    ("OpenAI API key", re.compile(r"sk-(proj-)?[A-Za-z0-9]{32,}")),
    ("AWS access key id", re.compile(r"\b(AKIA|ASIA)[0-9A-Z]{16}\b")),
    ("Google API key", re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b")),
    ("GitHub token", re.compile(r"\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{50,}")),
    ("Slack token", re.compile(r"\bxox[abposr]-[A-Za-z0-9-]{10,}")),
    ("Stripe secret key", re.compile(r"\b(sk|rk)_live_[A-Za-z0-9]{20,}")),
    ("private key block", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
]
SECRET_FILES = [".env", ".env.*", "*.pem", "*.key", "id_rsa", "id_ed25519", "*.p12", "*.pfx"]
SECRET_FILE_OK = [".env.example", ".env.sample", ".env.template"]
DESIGN_TARGETS = (".claude/ui-ux/", ".claude/DESIGN.md")
BANNED_LIST = ".claude/ui-ux/BANNED_REFERENCES.txt"

DEFAULTS = {
    "dash_exclude": ["*.lock", "package-lock.json", "*.min.js", "*.min.css"],
    "secret_exclude": [],
    "ban_scan": "",
    "fast_tests": "",
}


def git(*args: str) -> str:
    out = subprocess.run(["git", *args], capture_output=True, check=True)
    return out.stdout.decode("utf-8", errors="replace")


def load_config(root: Path) -> dict:
    cfg = dict(DEFAULTS)
    path = root / ".claude" / "gates.json"
    if path.is_file():
        cfg.update(json.loads(path.read_text(encoding="utf-8")))
    return cfg


def matches(path: str, patterns) -> bool:
    name = path.rsplit("/", 1)[-1]
    return any(fnmatch.fnmatch(path, p) or fnmatch.fnmatch(name, p) for p in patterns)


def added_lines():
    """Yield (file, line number, text) for every line the commit adds."""
    diff = git("diff", "--cached", "-U0", "--no-color", "--no-ext-diff", "--diff-filter=ACMR")
    current, lineno = None, 0
    for line in diff.splitlines():
        if line.startswith("+++ "):
            current = line[6:] if line.startswith("+++ b/") else None
        elif line.startswith("@@"):
            m = re.search(r"\+(\d+)", line)
            lineno = int(m.group(1)) if m else 0
        elif line.startswith("+") and current:
            yield current, lineno, line[1:]
            lineno += 1


def dash_hits(text: str):
    return [name for ch, name in DASHES.items() if ch in text]


def check_dashes(lines, cfg):
    errors = []
    for path, n, text in lines:
        if matches(path, cfg["dash_exclude"]):
            continue
        for name in dash_hits(text):
            errors.append(f"{name} in {path}:{n}: {text.strip()[:80]}")
    return errors


def check_secrets(lines, staged, cfg):
    errors = []
    for path in staged:
        if matches(path, SECRET_FILES) and not matches(path, SECRET_FILE_OK):
            errors.append(f"key file staged: {path} (unstage it and add it to .gitignore)")
    for path, n, text in lines:
        if matches(path, cfg["secret_exclude"]):
            continue
        for label, pattern in SECRET_PATTERNS:
            if pattern.search(text):
                errors.append(f"{label} in {path}:{n} (the value is not printed)")
    return errors


def check_ban_scan(root: Path, staged, cfg):
    design = [p for p in staged
              if (p.startswith(DESIGN_TARGETS[0]) or p == DESIGN_TARGETS[1]) and p != BANNED_LIST]
    if not design:
        return [], []
    scanner = Path(cfg["ban_scan"]) if cfg["ban_scan"] else None
    if not scanner or not scanner.is_file():
        # Fail closed: a design file is staged and nothing can scan it.
        return [f"ban_scan could not run: scanner not found at {cfg['ban_scan']!r}. Set ban_scan in "
                f".claude/gates.json to the real path of ban_scan.py, then commit again."], []
    # The repo's own banned list wins; without one, ban_scan falls back to the harness list.
    own_list = ["--banned-list", str(root / BANNED_LIST)] if (root / BANNED_LIST).is_file() else []
    errors = []
    with tempfile.TemporaryDirectory() as tmp:
        for path in design:
            staged_copy = Path(tmp) / path
            staged_copy.parent.mkdir(parents=True, exist_ok=True)
            staged_copy.write_bytes(subprocess.run(["git", "show", f":{path}"], capture_output=True).stdout)
            r = subprocess.run([sys.executable, str(scanner), "--path", str(staged_copy), *own_list],
                               capture_output=True, text=True, encoding="utf-8", errors="replace")
            if r.returncode != 0:
                detail = "\n    ".join(l for l in r.stdout.splitlines() if "BLOCK" in l) or r.stderr.strip()
                errors.append(f"ban_scan failed on {path}:\n    {detail}")
    return errors, []


def check_tests(root: Path, cfg):
    cmd = (cfg.get("fast_tests") or "").strip()
    if not cmd:
        return []
    r = subprocess.run(cmd, shell=True, cwd=root, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    if r.returncode != 0:
        tail = "\n    ".join((r.stdout + r.stderr).strip().splitlines()[-8:])
        return [f"fast tests failed: `{cmd}` exited {r.returncode}\n    {tail}"]
    return []


def report(title: str, errors, warnings=()) -> int:
    for w in warnings:
        print(f"devflow gates WARNING: {w}")
    if not errors:
        return 0
    print(f"devflow gates BLOCKED this {title}:")
    for e in errors:
        print(f"  - {e}")
    print("Fix the lines above and commit again. (.claude/gates.json holds the settings.)")
    return 1


def pre_commit() -> int:
    root = Path(git("rev-parse", "--show-toplevel").strip())
    cfg = load_config(root)
    lines = list(added_lines())
    staged = [p for p in git("diff", "--cached", "--name-only", "--diff-filter=ACMR").splitlines() if p]
    ban_errors, warnings = check_ban_scan(root, staged, cfg)
    errors = check_dashes(lines, cfg) + check_secrets(lines, staged, cfg) + ban_errors
    if not errors:
        errors = check_tests(root, cfg)  # slowest last, and only when the rest passed
    return report("commit", errors, warnings)


def commit_msg(msg_file: str) -> int:
    text = Path(msg_file).read_text(encoding="utf-8", errors="replace")
    lines = [l for l in text.splitlines() if not l.startswith("#")]
    errors = [f"{name} in the commit message, line {n}: {l.strip()[:80]}"
              for n, l in enumerate(lines, 1) for name in dash_hits(l)]
    return report("commit message", errors)


def main(argv) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if len(argv) >= 2 and argv[1] == "pre-commit":
        return pre_commit()
    if len(argv) >= 3 and argv[1] == "commit-msg":
        return commit_msg(argv[2])
    print("usage: commit_gates.py pre-commit | commit-msg <file>")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
