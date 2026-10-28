---
id: 0009-pat
title: 'A 6: Parity, docs, final verification'
purpose: Prove Part A left Platinum pixel-identical, document the vocabulary and cascade layers, and run the full gate before the branch is finished.
type: chor
status: pending
priority: "2"
effort: S
created: "2026-10-28T19:52:33.565Z"
updated: "2026-10-28T19:52:33.565Z"
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
    - ["0008-zlu", "depends"]
  plans:
    - ["0003-7x7", "included", ["6"]]
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

# A 6: Parity, docs, final verification

## Problem Statement

Umbrella 0002-ldj: every part re-shoots its parity set and must end pixel-identical for Platinum unless it names a visual change; Part A names none. After A 2.1–A 5.1 the state classes, `!important` removal and `@layer` wrapping must be verified against the A 0 baseline, and the new vocabulary (state classes, `CLASSICY_STATE`/`classicyStateClasses`, `classicy-state()`, part attributes, `className`/`style` rule, layer order) documented for app authors in `docs/AGENT-REFERENCE.md` and `CLAUDE.md`. The audit's §9 item 6 claim that `classicyWindowInvisible` is dead is corrected.

**Impact:** Without the after-shots a cascade regression from 4.1/4.2/5.1 ships unnoticed; without the docs, package authors (part B) and app authors have no reference for the names they must target. Part G's first story depends on this one.

## Steps

### 1: Re-shoot the parity set

Restart Storybook (so the 5.1 layer plugin is active) and re-shoot every id in `.playwright-mcp/parity/part-A/stories.txt` into `.playwright-mcp/parity/part-A/after/` with the A 0 procedure (`iframe.html?id=<id>&viewMode=story`, 1024×768, networkidle + 500 ms).

### 2: Compare before and after

`for f in .playwright-mcp/parity/part-A/before/*.png; do n=$(compare -metric AE "$f" ".playwright-mcp/parity/part-A/after/$(basename "$f")" null: 2>&1); echo "$n $(basename "$f")"; done | sort -n | tail` → every line starts with `0`. Any non-zero: open both images, find the rule whose cascade changed (4.1/4.2 removed `!important`; 5.1 layered it under a host rule), fix the SCSS — never the screenshot — and re-run.

### 3: Update docs/AGENT-REFERENCE.md and docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md

New subsection under §4 'Vocabulary' (after 4.0): the 15 state classes with the `.classicyButton.pressed` idiom, `CLASSICY_STATE`/`classicyStateClasses`, `classicy-state()`, the three part attributes with their values, the `className`/`style` rule, and the `@layer` order (host CSS wins unlayered; a package targets `classicy.package`). Replace any `data-state` mention (`grep -n data-state docs/AGENT-REFERENCE.md`). Correct §9 item 6 of docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md: `classicyWindowInvisible` is live (closed-but-mounted windows); only `classicyWindowZoomed` and `block` were dead.

### 4: Update CLAUDE.md

After the Theming section add: 'Vocabulary: shared state classes are bare and beside the root (`.classicyButton.pressed`), generated from `src/Appearance/vocabulary/ClassicyVocabulary.json` by `node bin/generate-vocabulary.ts` (run by `generate-barrels`; CI checks freshness). Part attributes `data-classicy-control|role|part`. Component CSS compiles into `@layer classicy.base`; no `!important` in src SCSS (test-enforced).'

### 5: Run the full gate

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source` → all PASS; `grep -rn '!important' src --include=*.scss | wc -l` → 0; `node bin/generate-vocabulary.ts --check` → exit 0.

### 6: Verify in the example app

`verify` skill: run the example app; open a window, collapse it, open an error alert, open the Apple menu; no console errors; `document.querySelector('.classicyWindow.active')` exists; `document.querySelector('[data-classicy-control="close"]')` exists.

### 7: Commit docs and stop servers

`git commit -m "docs(vocabulary): document state classes, part attributes, passthrough and cascade layers"` with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Stop background dev servers.

## Acceptance Criteria

- [ ] [MANUAL] Every Controls/*, Desktop/*, Dialogs/* story compares AE 0 before vs after (compare loop over .playwright-mcp/parity/part-A).
- [ ] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test && pnpm build:source
- [ ] VERIFY: grep -rn '!important' src --include=*.scss | wc -l  # 0; node bin/generate-vocabulary.ts --check  # exit 0
- [ ] docs/AGENT-REFERENCE.md §4 'Vocabulary' and CLAUDE.md describe the state classes, part attributes, passthrough rule and `@layer` order; no `data-state` mention remains; the audit's `classicyWindowInvisible` claim is corrected.

## Files

- `docs/AGENT-REFERENCE.md` - §4 Vocabulary subsection; data-state mentions replaced
- `docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md` (plan 0000-aud) - §9 item 6 correction (classicyWindowInvisible is live)
- `CLAUDE.md` - Vocabulary and cascade paragraph after Theming

## Work Log
