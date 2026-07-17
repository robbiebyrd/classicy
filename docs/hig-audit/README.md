# Mac OS 8 HIG → Classicy Component Audit

This folder captures the UI components defined in Apple's **Mac OS 8 Human
Interface Guidelines** (the "Platinum" HIG, Apple Computer, Inc. 9/2/97) and
audits them against the components implemented in **Classicy**.

Source document: `Apple_HIGOS8_Guidelines.pdf`
(mirror: <http://interface.free.fr/Archives/Apple_HIGOS8_Guidelines.pdf>,
HTML version: <https://dev.os9.ca/techpubs/mac/HIGOS8Guide/>).

## Files

| File | Purpose |
| --- | --- |
| [`hig-components.md`](./hig-components.md) | The **database**: every UI component/topic the HIG defines, with its specification (purpose, appearance, states, behavior, rules). |
| [`classicy-audit.md`](./classicy-audit.md) | The **audit**: each HIG component compared to Classicy's implementation, with status and gap notes. |

## Scope

- The catalog is driven **by the HIG**. Every component the HIG describes is
  included, whether or not Classicy implements it.
- Components that exist in Classicy but are **not** in the HIG (e.g.
  `ColorPicker`, `RichTextEditor`, `Boot`/`CrashScreen`, `FileBrowser`) are
  intentionally **out of scope** for this audit.

## HIG component catalog

Derived from the HIG table of contents (chapters 2–6).

### Chapter 2 — Control Guidelines
1. Push Buttons
2. Radio Buttons
3. Pop-Up Menu Buttons
4. Checkboxes
5. Bevel Buttons
6. Sliders and Tick Marks
7. Little Arrows
8. Clock Controls
9. Disclosure Triangles
10. List Boxes and Frames
11. Scroll Bars
12. Edit Text Fields and Frames
13. Static Text Fields
14. Tab Controls
15. Placards
16. Image Wells
17. Group Boxes
18. Separator Lines
19. Window Headers
20. Modeless Dialog Frames
21. Progress Indicators

### Chapter 3 — Dialog Box Guidelines
22. About Dialog Boxes
23. Movable Modal Dialog Boxes
24. Modal Dialog Boxes
25. Alert Boxes
26. Modeless Dialog Boxes
27. Keyboard Navigation and Focus
28. Layout Guidelines

### Chapter 4 — Menu Guidelines
29. Menu Bar
30. Sticky Menus
31. Contextual Menus

### Chapter 5 — Window Guidelines
32. Windows (Platinum Appearance)
33. Collapsing a Window (WindowShade)
34. Zoom Boxes

### Chapter 6 — Control Panel Guidelines
35. Control Panels
