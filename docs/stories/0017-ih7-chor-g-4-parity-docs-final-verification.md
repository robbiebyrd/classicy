---
id: 0017-ih7
title: 'G 4: Parity, docs, final verification'
purpose: Prove Part G changed no pixel beyond the named error-tint, document the color helpers, named derivations and metric reader, and run the full gate.
type: chor
status: pending
priority: "2"
effort: S
created: "2026-10-28T19:58:09.781Z"
updated: "2026-10-28T19:58:09.781Z"
links:
  repo:
    local: ~/classicy
    files:
      - docs/AGENT-REFERENCE.md
      - docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
      - CLAUDE.md
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0016-a5c", "depends"]
  plans:
    - ["0004-vqt", "included", ["4"]]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
  "5":
    status: pending
  "6":
    status: pending
  "7":
    status: pending
---

# G 4: Parity, docs, final verification

## Problem Statement

Umbrella 0002-ldj: every part ends pixel-identical for Platinum unless it names a visual change; Part G names exactly one (error title-bar fill #f7cecd → `classicy-tint("--color-error", 80%)` = #ffcccc, confined to the title bar of error-styled alerts). After G 1.2–G 3.2 the full parity set is compared against G 0, and `docs/AGENT-REFERENCE.md` §8, `CLAUDE.md` and the audit record the color helpers, the 35 derivations (name · formula · Platinum value · readers), the part H one-off multiplier inventory and `readClassicyThemeVar`.

**Impact:** Without the after-shots a halftone or font-size drift ships unnoticed; without the docs part H has no one-off inventory to start from and parts F/H have no reference for `readClassicyThemeVar` and the derivation names.

## Steps

### 1: Re-shoot the parity set

Restart Storybook and re-shoot every id in `.playwright-mcp/parity/part-G/stories.txt` into `.playwright-mcp/parity/part-G/after/` (G 0 procedure).

### 2: Compare before and after

`for f in .playwright-mcp/parity/part-G/before/*.png; do n=$(compare -metric AE "$f" ".playwright-mcp/parity/part-G/after/$(basename "$f")" ".playwright-mcp/parity/part-G/diff/$(basename "$f")" 2>&1); echo "$n $(basename "$f")"; done | sort -n | tail -20` → every line is `0` except the error-styled alert stories named in G 1.2 step 7; for those open `diff/<id>.png` and confirm the changed pixels lie inside the title bar only. List the non-zero ids and counts in the PR description under 'Named visual change'.

### 3: Update docs/AGENT-REFERENCE.md §8

'CSS custom properties': add a 'Color helpers' table (`classicy-tint/shade/alpha` → expansion → example), extend the 'Derived metrics' table (~lines 1144-1162) with the 35 entries from `CLASSICY_THEME_DERIVATIONS` (name · formula · Platinum value · readers), and add 'Multipliers still in SCSS (part H inventory)' listing every remaining `calc(var(--x) * N)` site from G 2.2 step 4 with file:line.

### 4: Update CLAUDE.md and docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md

CLAUDE.md Theming section: 'Colors: never a literal — use a `--color-*` token or `classicy-tint/shade/alpha("--color-x", pct)` from `src/Appearance/vocabulary/_color.scss`. Proportions: `getThemeVars` emits named derivations (`CLASSICY_THEME_DERIVATIONS`, `ClassicyThemeDerivations.ts`) such as `--window-collapsed-height`, `--menu-bar-height`, `--popup-height`, `--ui-font-size-small`; JS reads them with `readClassicyThemeVar` (`ClassicyThemeMetricReader.ts`), never a hard-coded number.' docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md §2.1: add 'Done (part G)'; §3.1 rows for :57/:120/:160/:1316, :958-959/:1098-1099, :1316-1317, :1492-1499: 'read from CSS (part G)'; §3.2 iconSize row likewise.

### 5: Run the full gate

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source` → PASS; `grep -c 'color-mix' dist/classicy.css` ≥ 14.

### 6: Verify in the example app

`verify` skill: run the example app; `getComputedStyle(document.querySelector('.classicyDesktop')).getPropertyValue('--menu-bar-height')` → `30px`; zoom a window (position lands at [8, 38]); collapse a window; open the Apple menu (min-width 180 px); no console errors.

### 7: Commit docs and stop servers

`git commit -m "docs(theme): color helpers, named derivations and the metric reader"` with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Stop background dev servers.

## Acceptance Criteria

- [ ] [MANUAL] Every parity story compares AE 0 except the named error-alert title bars, whose diff is confined to the title bar (compare loop over .playwright-mcp/parity/part-G).
- [ ] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source
- [ ] VERIFY: grep -c 'color-mix' dist/classicy.css   # >= 14
- [ ] AGENT-REFERENCE §8 lists the color helpers, the 35 derivations and the part H one-off inventory; CLAUDE.md and the audit (§2.1, §3.1, §3.2) are updated.
- [ ] [MANUAL] In the example app `--menu-bar-height` resolves to `30px`, a zoomed window lands at [8, 38], and the Apple menu is 180 px wide, with no console errors.

## Files

- `docs/AGENT-REFERENCE.md` - §8 color helpers, derived metrics (35), part H inventory
- `CLAUDE.md` - Theming paragraph: color helpers, derivations, readClassicyThemeVar
- `docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md` (plan 0000-aud) - §2.1, §3.1, §3.2 'Done (part G)' notes

## Work Log
