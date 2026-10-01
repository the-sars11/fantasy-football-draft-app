@../AGENTS.md

# CLAUDE.md - Claude Code extras

All repo rules are in `AGENTS.md` (imported above). Only Claude-specific notes live here.

## Preview

- Dev server config is in `.claude/launch.json`: use the `fantasy-football` entry (port 3003). The
  other entries are old per-session verify servers on their own ports.
- Load the real route yourself before handing Joe a link, e.g. `http://localhost:3003/prep/board`.
  A `?sim=1` URL on `/draft/live` is a fake session and is not proof for a feature that must work
  on the real route.

## Skills and checks

- `/bug-hunt free` on changed modules each sprint, `/bug-hunt full` monthly. The last full hunt
  was 2026-08-22 (see `.claude/BUG_LOG.md`).
- Repo skills in `.claude/skills/`: `code-review`, `plan-health`, `session-lifecycle` (generic
  copies; run them only when Joe asks).
- UI work past a copy or color tweak: load `design-director` first; the locked specs in
  `AGENTS.md` win on specific values.
- Session end: run the `end-session` skill.
