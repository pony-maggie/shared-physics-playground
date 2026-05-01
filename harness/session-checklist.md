# Session Checklist

## Start

1. Read `AGENTS.md`.
2. Run `./harness/init.sh`.
3. Review `state/progress.md`.
4. Review `state/handoff.md`.
5. Select one unfinished feature from `state/feature-list.json`.

## During Work

1. Keep scope to one feature.
2. Record blockers and assumptions as they appear.
3. Update or add verification notes when behavior changes.

## End

1. Run `./harness/verify.sh`.
2. Run `./harness/smoke.sh` when applicable.
3. Update `state/progress.md`.
4. Update `state/handoff.md`.
5. Record anything still broken, skipped, or unverified.
