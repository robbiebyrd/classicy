import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DIRECTUS_URL   = process.env.DIRECTUS_URL   ?? "http://localhost:8055";
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? "me@robbiebyrd.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "ButStayWok3!";
const OUT_PATH = join(__dirname, "../src/Applications/EPG/testdata.json");

const WINDOW_START = new Date("2001-09-10T00:00:00Z");
const WINDOW_END   = new Date("2001-09-20T00:00:00Z");

function toUTC(naive) {
  if (!naive) return null;
  const s = naive.replace(" ", "T");
  return s.endsWith("Z") || s.includes("+") ? s : s + "Z";
}

async function run() {
  const { data: { access_token: token } } = await fetch(DIRECTUS_URL + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  }).then(r => r.json());

  const params = new URLSearchParams({
    "limit": "-1",
    "filter[format][_eq]": "mp4",
    "filter[start_date][_gte]": "2001-09-10 00:00:00",
    "filter[start_date][_lte]": "2001-09-19 23:59:59",
    "sort[]": "start_date",
  });
  params.append("fields[]", "title");
  params.append("fields[]", "full_title");
  params.append("fields[]", "start_date");
  params.append("fields[]", "end_date");
  params.append("fields[]", "source.slug");

  const { data: items } = await fetch(
    DIRECTUS_URL + "/items/media_items?" + params,
    { headers: { Authorization: "Bearer " + token } }
  ).then(r => r.json());

  console.error(`Fetched ${items.length} mp4 items`);

  // Group by source slug
  const bySource = new Map();
  for (const item of items) {
    const slug = item.source?.slug;
    if (!slug) continue;
    if (!bySource.has(slug)) bySource.set(slug, []);
    bySource.get(slug).push({
      title:     item.title,
      fullTitle: item.full_title || item.title,
      start:     toUTC(item.start_date),
      end:       toUTC(item.end_date),
      selected:  false,
    });
  }

  // For each source, sort and fill gaps with UNKNOWN
  const channels = [];
  for (const [slug, programs] of bySource) {
    programs.sort((a, b) => new Date(a.start) - new Date(b.start));

    const grid = [];
    let cursor = WINDOW_START.getTime();

    for (const prog of programs) {
      const progStart = new Date(prog.start).getTime();
      const progEnd   = new Date(prog.end).getTime();

      if (progEnd <= WINDOW_START.getTime()) continue;
      if (progStart >= WINDOW_END.getTime()) break;

      if (cursor < progStart) {
        grid.push({
          title:    "UNKNOWN",
          start:    new Date(cursor).toISOString(),
          end:      new Date(progStart).toISOString(),
          selected: false,
        });
      }

      grid.push(prog);
      cursor = Math.max(cursor, progEnd);
    }

    // Trailing gap to end of window
    if (cursor < WINDOW_END.getTime()) {
      grid.push({
        title:    "UNKNOWN",
        start:    new Date(cursor).toISOString(),
        end:      WINDOW_END.toISOString(),
        selected: false,
      });
    }

    channels.push({ name: slug, number: "", callSign: "", location: "", icon: "", grid });
  }

  channels.sort((a, b) => a.name.localeCompare(b.name));

  console.error(`Built ${channels.length} channels`);
  for (const ch of channels) {
    const unknown = ch.grid.filter(g => g.title === "UNKNOWN").length;
    console.error(`  ${ch.name}: ${ch.grid.length} entries (${unknown} UNKNOWN)`);
  }

  writeFileSync(OUT_PATH, JSON.stringify(channels, null, "\t") + "\n");
  console.error(`Written to ${OUT_PATH}`);
}

run().catch(e => { console.error(e); process.exit(1); });
