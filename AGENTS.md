# Agent Workflow

This repository uses a lightweight harness-first workflow.

Before starting work on any task:

1. Read this file and [CLAUDE.md](/Users/malu/Documents/project/shared-physics-playground/CLAUDE.md).
2. Run `./harness/init.sh`.
3. Read `state/progress.md`, `state/handoff.md`, and `state/feature-list.json`.
4. Choose exactly one unfinished feature before making changes, or declare one new scoped follow-up if the current list is complete.

Execution rules:

- Work on one feature at a time.
- Keep changes inside the declared scope for that feature.
- Run `./harness/verify.sh` before claiming completion.
- Run `./harness/smoke.sh` when the change affects runnable behavior.
- Update `state/progress.md` and `state/handoff.md` at the end of the session.

Completion rules:

- Do not mark work complete without fresh verification evidence.
- Leave a clean restart path for the next session.
- Record open risks, skipped verification, and next steps explicitly.
