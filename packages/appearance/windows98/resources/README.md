# About this directory

Files in this folder are reference sources for the Windows 98 Appearance
Package. They are never published (the package's `files` lists `dist`,
`src/styles`, the README and the license) and never scanned by the SCSS
gates.

- `Microsoft_WindowsInterfaceGuidelines_1995.pdf`: _The Windows Interface
  Guidelines — A Guide for Designing Software_, Microsoft Corporation,
  February 1995 (the pre-release of the Microsoft Press book, ISBN
  1-55615-679, as Microsoft published it on the web and as the University of
  Bremen's software-ergonomics institute reassembled it in 1999; 372 pages).
  The authority for the package's look and behavior, cited as **WIG** by
  chapter, topic and printed page (`WIG Ch.13 "Window Border Style" (p.302)`)
  in `docs/plans/windows-guidelines-audit.md` and in the partials' comments.
  Its chapters 3 (the Windows environment), 6 (windows), 7 (menus, controls
  and toolbars), 8 (secondary windows: dialogs, property sheets, message
  boxes) and 13 (visual design: color, fonts, border styles, layout in
  dialog units) are the ones the package draws from.
