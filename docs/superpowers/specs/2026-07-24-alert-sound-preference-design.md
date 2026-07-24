# Default Alert Sound Preference — Design Spec

**Date:** 2026-07-24
**Status:** Approved (brainstorming)

## Overview

Add a user-selectable **default alert sound** to Classicy. A new "Sound" tab in
the Appearance Manager lets the user pick one of the seven `ClassicyAlert*`
sprite sounds; the choice persists in the Appearance state. An application-wide
`ClassicyAlertSound` sound-dispatch event (plus a `useClassicyAlertSound()`
convenience hook) plays the currently-selected alert. The generic
`ClassicySoundPlayError` beep also falls back to the selected alert sound.
Default selection: **Sosumi**.

## Goals

- Persisted user preference for the default alert sound.
- A "Sound" tab in the Appearance Manager with a pop-up menu of all seven
  `ClassicyAlert*` sounds, auditioning the sound on select.
- An app-wide trigger — event `ClassicyAlertSound` and hook
  `useClassicyAlertSound()` — that plays the selected alert.
- `ClassicySoundPlayError` falls back to the selected alert sound (this also
  fixes a latent no-op — see Non-Goals note).

## Non-Goals

- No changes to the audio sprite build or new sound assets (all seven sprites
  already exist in `assets/sounds/platinum/`).
- No per-app alert-sound overrides; a single global preference.
- No volume/other sound settings in the new tab yet (named "Sound" to leave
  room, but scope is alert-sound selection only).

### Note: latent PlayError no-op

`ClassicySoundPlayError`'s current guard is
`if (action.sound && playerCanPlayInterrupt(ss, action.sound))`. Callers
dispatch `{ type: "ClassicySoundPlayError" }` with **no** `sound`, so it
currently short-circuits and plays nothing (the `|| "ClassicyAlertWildEep"`
fallback is dead code). Routing PlayError through the selected alert sound
fixes this — it will now actually beep.

## The Seven Alert Sounds

Sprite keys confirmed present in `assets/sounds/platinum/platinum.json`:
`ClassicyAlertBonk`, `ClassicyAlertGrowl`, `ClassicyAlertIndigo`,
`ClassicyAlertQuack`, `ClassicyAlertSosumi`, `ClassicyAlertTabitha`,
`ClassicyAlertWildEep`.

## Architecture

Two state systems are involved (unchanged pattern):

- **Zustand** `System.Manager.Appearance` — holds the *persisted selection*
  (`alertSound`), written by a `ClassicyDesktopChangeAlertSound` reducer event.
- **Sound Manager** (React Context `useReducer`) — plays Howler sprites. It
  gains an `alertSound` field in its own state, kept in sync from Zustand by
  the provider, so the pure reducer never reaches across stores.

Data flow:

```
Sound tab select ──▶ ClassicyDesktopChangeAlertSound ──▶ Zustand Appearance.alertSound (persisted)
                                                              │
              ClassicySoundManagerProvider (useEffect) ◀──────┘  reads selection
                                                              │
                                            ClassicySoundSetAlertSound ──▶ sound state ss.alertSound
                                                              │
   player({type:"ClassicyAlertSound"}) / useClassicyAlertSound() ──▶ plays ss.alertSound
   player({type:"ClassicySoundPlayError"}) (no sound) ─────────────▶ falls back to ss.alertSound
```

## Shared Catalog

New module `src/SystemFolder/ControlPanels/SoundManager/ClassicyAlertSounds.ts`:

```ts
export const DEFAULT_ALERT_SOUND = "ClassicyAlertSosumi";

export interface ClassicyAlertSoundOption {
  value: string; // sprite key
  label: string; // display name
}

export const CLASSICY_ALERT_SOUNDS: ClassicyAlertSoundOption[] = [
  { value: "ClassicyAlertBonk", label: "Bonk" },
  { value: "ClassicyAlertGrowl", label: "Growl" },
  { value: "ClassicyAlertIndigo", label: "Indigo" },
  { value: "ClassicyAlertQuack", label: "Quack" },
  { value: "ClassicyAlertSosumi", label: "Sosumi" },
  { value: "ClassicyAlertTabitha", label: "Tabitha" },
  { value: "ClassicyAlertWildEep", label: "Wild Eep" },
];
```

Used by both the Sound tab (options) and the sound reducer/hook (default).

## Sound Manager Changes

`ClassicySoundManagerUtils.tsx`:

- `ClassicySoundState` gains `alertSound?: string`.
- `initialPlayer.alertSound = DEFAULT_ALERT_SOUND`.
- `ClassicySoundActionTypes` gains `ClassicyAlertSound` and
  `ClassicySoundSetAlertSound`.
- Reducer cases:
  - `ClassicySoundSetAlertSound`: `next = { ...ss, alertSound: action.sound ?? ss.alertSound }`.
  - `ClassicyAlertSound`: resolve `const sound = ss.alertSound ?? DEFAULT_ALERT_SOUND`; if `playerCanPlayInterrupt(ss, sound)` then `stop()` + `play(sound)`.
  - `ClassicySoundPlayError`: resolve `const sound = action.sound ?? ss.alertSound ?? DEFAULT_ALERT_SOUND`; if `playerCanPlayInterrupt(ss, sound)` then `stop()` + `play(sound)`. (Removes the `action.sound &&` short-circuit.)

`ClassicySoundManagerProvider.tsx`:

- Read `const alertSound = useAppManager(s => s.System.Manager.Appearance?.alertSound)`.
- `useEffect` dispatching `{ type: "ClassicySoundSetAlertSound", sound: alertSound }` whenever `alertSound` changes (skip when undefined). Keeps the reducer pure; provider bridges Zustand → sound context. (Watch for an import cycle — the provider will import `useAppManager` from `ClassicyAppManagerUtils`; the build/tsc catches cycles.)

Convenience hook (in `ClassicySoundManagerContext.tsx`, re-exported):

```ts
export function useClassicyAlertSound() {
  const dispatch = useSoundDispatch();
  return useCallback(() => dispatch({ type: "ClassicyAlertSound" }), [dispatch]);
}
```

## Appearance State Changes

- `ClassicyStoreSystemAppearanceManager` (`ClassicyAppearance.ts`) gains
  `alertSound?: string`.
- Initial Appearance state (`ClassicyAppManager.ts`) sets
  `alertSound: DEFAULT_ALERT_SOUND`.
- `ClassicyActionPredicates.ts` gains
  `hasAlertSound(m): m is Msg & { alertSound: string }` → `typeof m.alertSound === "string"`.
- `ClassicyDesktopManager.tsx` reducer gains a `ClassicyDesktopChangeAlertSound`
  case: `if (!hasAlertSound(action)) break; ds.System.Manager.Appearance.alertSound = action.alertSound;`.

## Sound Tab

New `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Sound.tsx`:

```ts
interface SoundTabProps {
  alertSound: string;
  changeAlertSound: (e: ChangeEvent<HTMLSelectElement>) => void;
}

export const useSoundTab = ({ alertSound, changeAlertSound }: SoundTabProps): TabIndividual =>
  useMemo(() => ({
    title: "Sound",
    children: (
      /* ControlLabel "Alert Sound" + ClassicyPopUpMenu id="alertSound"
         options={CLASSICY_ALERT_SOUNDS} selected={alertSound}
         onChangeFunc={changeAlertSound} */
    ),
  }), [alertSound, changeAlertSound]);
```

Wiring in `ClassicyAppearanceManager.tsx`:

- `const changeAlertSound = useCallback((e) => {
    const value = e.target.value;
    startTransition(() => desktopEventDispatch({ type: "ClassicyDesktopChangeAlertSound", alertSound: value }));
    player({ type: "ClassicySoundPlayInterrupt", sound: value }); // audition
  }, [desktopEventDispatch, player])`.
- `const soundTab = useSoundTab({ alertSound: appearanceState.alertSound ?? DEFAULT_ALERT_SOUND, changeAlertSound })`.
- Add `soundTab` to the `tabs` array (after Fonts).

## Files

Create:
- `src/SystemFolder/ControlPanels/SoundManager/ClassicyAlertSounds.ts`
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Sound.tsx`

Modify:
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils.tsx`
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider.tsx`
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext.tsx`
- `src/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates.ts`
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts`
- `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts`
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx`
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx`

Barrels (`index.ts`) are auto-generated — not hand-edited.

## Testing

- **Sound reducer** (`ClassicySoundStateEventReducer.test.ts`, extend):
  - `ClassicySoundSetAlertSound` sets `ss.alertSound`.
  - `ClassicyAlertSound` plays `ss.alertSound`; falls back to
    `DEFAULT_ALERT_SOUND` when unset.
  - `ClassicySoundPlayError` with no `sound` plays `ss.alertSound` (regression:
    previously a no-op); with explicit `sound` still plays that sound.
  - A disabled sound (`disabled` includes it or "*") does not play.
- **Predicate** (`ClassicyActionPredicates` test if present, else inline):
  `hasAlertSound` true only for string `alertSound`.
- **Desktop reducer**: `ClassicyDesktopChangeAlertSound` writes
  `Appearance.alertSound`; ignores a non-string payload.
- **Sound tab** (`ClassicyAppearanceManager.Sound.test.tsx`): renders the
  pop-up with seven options, reflects `selected`, and calls `changeAlertSound`
  on change.
- **Hook** (`useClassicyAlertSound.test.tsx`): calling the returned function
  dispatches `{ type: "ClassicyAlertSound" }`.

## Open Questions

None. All decisions resolved during brainstorming.
