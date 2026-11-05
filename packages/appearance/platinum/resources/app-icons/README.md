# app-icons

75,052 32×32 Macintosh icons, scraped from
[A Visual Catalog of Retro Macintosh Software](https://www.marciot.com/mac68k-visual-catalog/).
The underlying media are catalogued at the
[Macintosh Garden](https://macintoshgarden.org/); see the catalog's
[about page](https://www.marciot.com/mac68k-visual-catalog/about.html) for the
original sources.

These files are committed as data. The one-off scraper that produced them is
deliberately **not** checked in, so there is no build step to run and nothing
here is regenerated automatically. Should the tree ever need rebuilding, the
catalog serves `iconCollection/index.csv` plus per-prefix `.tgz` archives of
PNGs; each icon's kind comes from an iTXt `MacOS Info` chunk inside its PNG and
its names from a sidecar CSV.

## Layout

Icons are filed by **what kind of Macintosh file they came from**, then by name.

Classic Mac OS had no file extensions: a file's kind lived in a four-character
*type* code, which the catalog preserves inside each PNG. Only 14,141 icons
(18.8%) still carry one — those are the entries the catalog page tints green.

| Directory | Contents |
|---|---|
| `applications/` | `APPL` and friends — 5,327 icons |
| `control-panels/` | `cdev`, `sdev` |
| `extensions/` | `INIT`, `RDEV`, printer drivers, components |
| `desk-accessories/` | `dfil` Font/DA Mover suitcases |
| `system/`, `preferences/`, `fonts/`, `resources/` | system software |
| `documents/`, `images/`, `sounds/`, `movies/`, `archives/` | data files |
| `stacks/` | HyperCard (`STAK`) |
| `folders/`, `disks/`, `disk-images/` | Finder containers |
| `other/<TYPE>/` | a type code we have not named, with ≥8 icons |
| `other/misc/` | rarer type codes; the code is the filename prefix |
| `other/unknown/` | `????` and `****`, the Finder's own "no type" wildcards |
| `unclassified/<letter>/` | 60,911 icons whose file recorded no type at all |

`unclassified/` is by far the largest group and is bucketed by first letter so
no single directory holds 60k files.

## index.json

The tree is **lossy on purpose**. One icon was often found under many names, on
many different CD-ROMs — an average of 2.3, and as many as 348 — but a folder
tree can only file it once. `index.json` is the only place the full record
survives:

```json
{
  "path": "applications/MaxRAM 1.0.2.png",
  "id": "--0XJsI4TFtcW8achTDzui3LlUc",
  "type": "APPL",
  "creator": "MxRM",
  "names": ["MaxRAM 1.0.2"],
  "media": ["MaximuM Vol 1 (France)"]
}
```

`id` is the icon's content hash, and is also its filename in the upstream
archives. Filenames are the most-cited name for that icon, with `-2`, `-3`
suffixes where several distinct icons share a name (an application and its
documents usually do).

Names are decoded from their original Macintosh encodings — MacRoman, or
Shift-JIS for the Japanese collections — so `™`, `®` and accented characters are
preserved as written.

## Note

These icons are not part of the published npm package: `resources/` is outside
the `files` list in `package.json`.
