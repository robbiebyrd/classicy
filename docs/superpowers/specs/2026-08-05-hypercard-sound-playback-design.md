# HyperCard Sound Playback — Unmasked Effects and Sound Selection

**Status:** Approved (design)
**Date:** 2026-08-05
**Issues:** #220 (Beep button plays nothing), #235 (allow playing any sound)

## Goal

Make HyperCard's `beep` and `play` script effects audible when triggered from a
button, and let stack authors pick a sound from the registered Classicy sounds
instead of typing a sprite id by hand.

## Background

### Why `beep` is silent (#220)

All Classicy audio runs through a **single `Howl` instance** holding a 41-entry
sprite map (`ClassicySoundManagerUtils.tsx:1`, `assets/sounds/platinum/platinum.json`).
Howler's `playing()` with no arguments reports whether *any* sprite on that
instance is sounding. The play predicate is:

```ts
const playerCanPlay = (ss: ClassicySoundState, sound: string) =>
    playerCanPlayInterrupt(ss, sound) && !ss.soundPlayer?.playing();
```

— `ClassicySoundManagerUtils.tsx:140-142`

So `ClassicySoundPlay` means "play only if the system is completely silent," and
a request that arrives during any other sound is **dropped without error**.

The HyperCard sample stack's Beep button (`HyperCardSampleStack.ts:51-55`) binds
`{ do: "beep" }` to `onMouseUp`. `ClassicyButton` plays `ClassicyButtonClickUp`
on mouse-up (`ClassicyButton.tsx:121`), and the engine's queued `beep` effect is
consumed in the same tick (`HyperCard.tsx:158-159`). The click sound is still
sounding, so `playerCanPlay` returns false and the beep never plays.

The sprite itself is fine: `ClassicyBeep` exists in both the sprite map and
`ClassicySoundManagerLabels.json:9`. This is purely the one-voice gate.

### Why `play` takes a raw string (#235)

The visual script builder describes each verb's editable parameters with
`HCOptionField` records. `play` is declared as `play: [text("sound")]`
(`HyperCardScriptBuilder.tsx:50`), so the author gets a free-text box and must
know sprite ids like `ClassicyAlertSosumi` from memory.

## Requirements

- **R1** — A script-driven `beep` is audible even when a UI chrome sound (button
  click, menu click, window focus) is already playing.
- **R2** — A script-driven `play` is audible under the same conditions.
- **R3** — The fix is confined to HyperCard. `ClassicySoundPlay` semantics stay
  unchanged for every other caller in the library.
- **R4** — The script builder's `play` row presents the registered Classicy
  sounds for selection rather than a bare text field.
- **R5** — A `play` action whose current sound is **not** in the registered list
  (a plugin-supplied sound, or a hand-authored stack) keeps its value. It is
  never silently reset to a default.
- **R6** — The sound picker mechanism is available to third-party command
  authors, not hardcoded into the `play` row.

## Design

### R1–R3: switch HyperCard effects to `ClassicySoundPlayInterrupt`

`HyperCard.tsx:158-161` changes both effect branches:

```ts
if (e.kind === "beep") {
    player({ type: "ClassicySoundPlayInterrupt", sound: "ClassicyBeep" });
} else if (e.kind === "play") {
    player({ type: "ClassicySoundPlayInterrupt", sound: e.sound });
}
```

`ClassicySoundPlayInterrupt` (`ClassicySoundManagerUtils.tsx:168-175`) gates on
`playerCanPlayInterrupt`, which checks only the disabled list and player
presence — not `playing()`. Script sounds are therefore never masked.

This touches one file. No shared reducer or predicate changes, so no other
component's audio behavior moves.

#### Accepted trade-off

`ClassicySoundPlayInterrupt` calls `ss.soundPlayer?.stop()` with **no
arguments**, which stops *every* sounding sprite before playing. A script that
starts a long sound and then beeps will have the long sound cut off.

This is accepted: for script-driven audio the most recently requested sound is
the intended one, and the alternative (a mixing action that layers without
stopping) was considered and rejected as unnecessary library surface for this
issue. If a stack ever needs layered audio, a mixing action can be added later
without revisiting this change.

### R4–R6: a `sound` option-field kind

**Type change.** Extend the public union at `HyperCardPlugins.ts:186`:

```ts
kind: "text" | "number" | "checkbox" | "choices" | "json" | "sound";
```

Because `HCOptionField` is exported and used by `HyperCardCommandEditorMeta`
and `HyperCardPartEditorMeta`, registered custom commands and parts get the
picker for free (R6).

**Spec change.** Add a `sound` field helper beside the existing `text`/`num`
helpers in `HyperCardScriptBuilder.tsx:27-36`, and redeclare the verb:

```ts
play: [sound("sound")],
```

**Renderer change.** Add a `field.kind === "sound"` branch at the top of
`ActionField` (`HyperCardScriptBuilder.tsx:303`), before the `choices` branch.
It reads `useSound().labels` (`ClassicySoundInfo[]` — `{ id, group, label,
description }`) and renders a `ClassicyPopUpMenu`.

Unlike the text branches — which commit on blur/Enter because they wrap an
uncontrolled `ClassicyInput` — a pop-up menu commits directly in
`onChangeFunc`.

**Option construction.**

1. Sort labels by `group`, then by `label`.
2. Map each to `{ value: id, label: `${group} — ${label}` }`.
3. If the action's current value is a non-empty string absent from that list,
   append `{ value: current, label: current }` so the selection round-trips
   intact (R5).

`ClassicyPopUpMenu.options` is a flat `{ value, label, icon? }[]` with **no
`optgroup` support**, so the group is carried in the label text. Adding real
option grouping to `ClassicyPopUpMenu` is deliberately out of scope.

## Data Flow

```
button mouseUp
  └─ ClassicyButton plays ClassicyButtonClickUp
  └─ engine queues { kind: "beep" } in runtime.pendingEffects
       └─ HyperCard.tsx effect consumer (dedup by effect id)
            └─ player({ type: "ClassicySoundPlayInterrupt", sound })
                 └─ playerCanPlayInterrupt → stop() → play(sprite)
```

The existing `playedRef` id-dedup in `HyperCard.tsx:144-157` is unchanged; each
effect still fires exactly once.

## Error Handling

- A `play` naming a sprite that does not exist: Howler's `play()` with an
  unknown sprite key is a no-op. No new guard is added — silently doing nothing
  matches the current behavior for a mistyped sound, and R5 requires that we
  preserve such values rather than reject them.
- Sounds the user has disabled (`ss.disabled`) stay suppressed. The interrupt
  predicate still honors the disabled list, so a muted system remains muted.
- No `AnalyticsProvider`/sound provider mounted: `useSound()` returns the
  default context whose `soundPlayer` is null; both predicates short-circuit.

## Testing

- **Reducer:** `ClassicySoundPlayInterrupt` plays while another sprite is
  sounding, where `ClassicySoundPlay` does not — the direct regression test for
  #220.
- **Reducer:** a disabled sound stays suppressed under `PlayInterrupt`.
- **HyperCard:** a `beep` effect dispatches `ClassicySoundPlayInterrupt`, and
  each queued effect id fires exactly once.
- **Script builder:** the `play` row renders a pop-up menu, not a text input.
- **Script builder:** selecting an option commits that sprite id to the action.
- **Script builder:** an action holding an unregistered sound renders it as the
  selected option and does not reset it (R5).

## Out of Scope

- Option grouping (`optgroup`) in `ClassicyPopUpMenu`.
- A mixing/layering sound action.
- Changing `ClassicySoundPlay` semantics for any non-HyperCard caller.
- Previewing (auditioning) a sound from the picker.
