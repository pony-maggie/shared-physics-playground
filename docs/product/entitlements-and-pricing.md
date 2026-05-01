# Entitlements And Pricing

This document records the current product policy. It is not a billing implementation.

## Plans

| Plan | Access | Custom AI experiments | Save/reopen surface |
| --- | --- | --- | --- |
| Guest | No sign-in required | None. Gets the fixed inclined-plane demo only. | Not exposed. |
| Free | Email sign-in | 1 lifetime text-generated experiment. | Not exposed. |
| Pro | Email sign-in plus Pro entitlement | 30 text-generated experiments per day, plus 10 image/sketch-generated experiments per day. | Not exposed until there is a useful library or reopen path. |

## Current Implementation

- Default authenticated users are `free`.
- Pro access is currently granted by operator-managed email overrides in `config/playground-access.json`.
- Usage is tracked in SQLite through `usage_events`.
- The saved-experiment UI is hidden. Lower-level `saved_simulations` storage still exists, but it is not part of the current user-facing plan promise.
- The default inclined-plane demo is local and does not call a large model.

## Pricing

Pricing is not set yet.

Open decisions:

- Pro monthly and annual price.
- Whether Free should get recurring monthly text generations instead of a one-time trial.
- Whether Pro should allow paid overages after daily limits.
- Payment provider and subscription lifecycle rules.
