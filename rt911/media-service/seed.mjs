/**
 * bootstrap.mjs
 *
 * Creates the Directus schema and imports both datasets from scratch:
 *   1. entries_media.json  → media_items (TV / m3u8 broadcast records)
 *   2. entries_news.json   → media_items (news/history entries, dates parsed from titles)
 *
 * Usage:
 *   cp .env.example .env   # fill in values
 *   docker compose up -d
 *   node bootstrap.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DIRECTUS_URL   = process.env.DIRECTUS_URL   ?? "http://localhost:8055";
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "changeme";
const DB_USER        = process.env.DB_USER        ?? "directus";
const DB_DATABASE    = process.env.DB_DATABASE    ?? "directus";

const MEDIA_DATA_PATH = process.env.MEDIA_DATA_PATH ?? join(__dirname, "entries_media.json");
const NEWS_DATA_PATH  = process.env.NEWS_DATA_PATH  ?? join(__dirname, "entries_news.json");

const NEWS_SOURCE_NAME       = "History Commons";
const DEFAULT_CALC_DURATION  = 300;  // 5 minutes in seconds
const FIVE_MINUTES_SECONDS   = 300;
const ONE_HOUR_SECONDS       = 3600;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function getToken() {
  const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${await res.text()}`);
  const { data } = await res.json();
  return data.access_token;
}

async function api(token, method, path, body) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

function psql(sql) {
  const result = spawnSync(
    "docker",
    ["compose", "exec", "-T", "database", "psql", "-U", DB_USER, "-d", DB_DATABASE, "-v", "ON_ERROR_STOP=1"],
    { input: sql, cwd: __dirname, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`psql failed:\n${result.stderr || result.stdout}`);
  }
}

function sqlVal(v) {
  if (v === null || v === undefined || v === "") return "NULL";
  if (typeof v === "number") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

// ---------------------------------------------------------------------------
// Schema setup
// ---------------------------------------------------------------------------

async function createCollections(token) {
  const existing = await api(token, "GET", "/collections");
  const names = existing.data.map((c) => c.collection);

  if (!names.includes("sources")) {
    console.log("Creating collection: sources");
    await api(token, "POST", "/collections", {
      collection: "sources",
      meta: { icon: "radio", note: "Broadcast sources / networks" },
      schema: {},
      fields: [
        { field: "id",          type: "integer", schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true, readonly: true } },
        { field: "name",        type: "string",  schema: { is_nullable: false }, meta: { required: true, interface: "input", width: "half" } },
        { field: "slug",        type: "string",  schema: { is_nullable: false, is_unique: true }, meta: { required: true, interface: "input", width: "half" } },
        { field: "description", type: "text",    schema: {}, meta: { interface: "input-multiline" } },
      ],
    });
  } else {
    console.log("Collection sources already exists, skipping.");
  }

  if (!names.includes("media_items")) {
    console.log("Creating collection: media_items");
    await api(token, "POST", "/collections", {
      collection: "media_items",
      meta: { icon: "movie", sort_field: "sort", note: "Scheduled broadcast media" },
      schema: {},
      fields: [
        { field: "id",            type: "integer",  schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true, readonly: true } },
        { field: "title",         type: "string",   schema: { is_nullable: false }, meta: { required: true, interface: "input", width: "half" } },
        { field: "full_title",    type: "string",   schema: {}, meta: { interface: "input", width: "half" } },
        { field: "start_date",    type: "dateTime", schema: { is_nullable: false }, meta: { required: true, interface: "datetime", width: "half" } },
        { field: "end_date",      type: "dateTime", schema: { is_nullable: true }, meta: { interface: "datetime", width: "half" } },
        { field: "timezone",      type: "string",   schema: { is_nullable: true }, meta: { interface: "input", width: "half" } },
        { field: "url",           type: "string",   schema: { is_nullable: true }, meta: { interface: "input", width: "full" } },
        { field: "format",        type: "string",   schema: { is_nullable: true }, meta: { interface: "select-dropdown", width: "half", options: { choices: ["m3u8", "mp4", "mp3", "html", "modal", "news"].map((v) => ({ text: v.toUpperCase(), value: v })) } } },
        { field: "image",         type: "string",   schema: { is_nullable: true }, meta: { interface: "input", width: "half" } },
        { field: "image_caption", type: "string",   schema: { is_nullable: true }, meta: { interface: "input", width: "half" } },
        { field: "content",       type: "text",     schema: { is_nullable: true }, meta: { interface: "input-multiline" } },
      ],
    });
  } else {
    console.log("Collection media_items already exists, skipping.");
  }

  // Numeric fields added individually — the bulk collection endpoint silently creates
  // string columns instead of numeric ones when type is specified in the bulk payload.
  const numericFields = [
    { field: "source",        type: "integer", schema: { is_nullable: true },    meta: { interface: "select-dropdown-m2o", display: "related-values", width: "half" } },
    { field: "calc_duration", type: "integer", schema: { is_nullable: true },    meta: { interface: "input", width: "half", note: "Duration in seconds" } },
    { field: "approved",      type: "integer", schema: { default_value: 1 },     meta: { interface: "input", width: "half", note: "1 = approved, 0 = pending" } },
    { field: "mute",          type: "integer", schema: { default_value: 0 },     meta: { interface: "input", width: "half", note: "1 = muted, 0 = audible" } },
    { field: "volume",        type: "float",   schema: { default_value: 1 },     meta: { interface: "slider", width: "half", options: { min: 0, max: 1, step: 0.05 } } },
    { field: "jump",          type: "integer", schema: { default_value: 0 },     meta: { interface: "input", width: "half", note: "Playback start offset (seconds)" } },
    { field: "trim",          type: "integer", schema: { default_value: 0 },     meta: { interface: "input", width: "half", note: "Trim from end (seconds)" } },
    { field: "sort",          type: "integer", schema: { is_nullable: true },    meta: { interface: "input", hidden: true } },
  ];

  const existingFields = await api(token, "GET", "/fields/media_items");
  const existingFieldNames = new Set(existingFields.data.map((f) => f.field));
  for (const fieldDef of numericFields) {
    if (existingFieldNames.has(fieldDef.field)) {
      console.log(`Field media_items.${fieldDef.field} already exists, skipping.`);
      continue;
    }
    console.log(`Creating field: media_items.${fieldDef.field}`);
    await api(token, "POST", "/fields/media_items", fieldDef);
  }
}

async function createRelations(token) {
  const existing = await api(token, "GET", "/relations");
  const alreadyLinked = existing.data.some(
    (r) => r.collection === "media_items" && r.field === "source",
  );
  if (alreadyLinked) {
    console.log("Relation media_items.source → sources already exists, skipping.");
    return;
  }
  console.log("Creating relation: media_items.source → sources.id");
  await api(token, "POST", "/relations", {
    collection: "media_items",
    field: "source",
    related_collection: "sources",
    schema: { on_delete: "SET NULL" },
    meta: { one_collection: "sources", one_field: null, sort_field: null },
  });
}

// ---------------------------------------------------------------------------
// TV / media import  (entries_media.json)
// ---------------------------------------------------------------------------

async function importSources(token, records) {
  const slugs = [...new Set(records.map((r) => r.source))];
  const existing = await api(token, "GET", "/items/sources?limit=-1&fields=slug");
  const existingSlugs = new Set(existing.data.map((s) => s.slug));

  const toCreate = slugs
    .filter((s) => s && !existingSlugs.has(s))
    .map((s) => ({ name: s, slug: s }));

  if (toCreate.length === 0) {
    console.log("All sources already exist, skipping.");
  } else {
    console.log(`Importing ${toCreate.length} sources…`);
    await api(token, "POST", "/items/sources", toCreate);
  }

  const all = await api(token, "GET", "/items/sources?limit=-1&fields=id,slug");
  return Object.fromEntries(all.data.map((s) => [s.slug, s.id]));
}

async function importMediaItems(token, records, sourceMap) {
  const existing = await api(token, "GET", "/items/media_items?limit=1&fields=id");
  if (existing.data.length > 0) {
    console.log("media_items already has records, skipping TV import.");
    return;
  }

  // Widen varchar columns — Directus creates string fields as varchar(255) which is
  // too short for content/url/etc.
  psql(`
    ALTER TABLE media_items
      ALTER COLUMN title          TYPE text,
      ALTER COLUMN full_title     TYPE text,
      ALTER COLUMN timezone       TYPE text,
      ALTER COLUMN url            TYPE text,
      ALTER COLUMN format         TYPE text,
      ALTER COLUMN image          TYPE text,
      ALTER COLUMN image_caption  TYPE text,
      ALTER COLUMN content        TYPE text;
  `);

  const BATCH = 500;
  console.log(`Importing ${records.length} TV media items in batches of ${BATCH}…`);

  const cols = `title,full_title,source,start_date,end_date,calc_duration,timezone,url,format,approved,mute,volume,jump,"trim",image,image_caption,content,sort`;

  for (let i = 0; i < records.length; i += BATCH) {
    process.stdout.write(`  ${i + 1}–${Math.min(i + BATCH, records.length)} / ${records.length}\r`);
    const batch = records.slice(i, i + BATCH);
    const rows = batch.map((r) => `(${[
      sqlVal(r.title?.trim()),
      sqlVal(r.full_title?.trim()),
      sqlVal(sourceMap[r.source] ?? null),
      sqlVal(r.start_date),
      sqlVal(r.end_date),
      sqlVal(r.calc_duration),
      sqlVal(r.timezone),
      sqlVal(r.url),
      sqlVal(r.format),
      sqlVal(r.approved),
      sqlVal(r.mute),
      sqlVal(r.volume),
      sqlVal(r.jump),
      sqlVal(r.trim),
      sqlVal(r.image || null),
      sqlVal(r.image_caption || null),
      sqlVal(r.content || null),
      sqlVal(r.sort),
    ].join(",")})`).join(",\n");

    psql(`INSERT INTO media_items (${cols}) VALUES\n${rows};\n`);
  }

  console.log("\nDone.");
}

// ---------------------------------------------------------------------------
// News date/time parsing  (entries_news.json)
// ---------------------------------------------------------------------------

const MONTH_NAMES = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function parseMonthName(name) {
  return MONTH_NAMES[name.toLowerCase()] ?? null;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDatetime(year, month = 1, day = 1, hour = 0, minute = 0, second = 0) {
  return `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
}

function parseClockTime(str) {
  const m = str.match(/(\d+):(\d+)\s*(a\.m\.|p\.m\.|am|pm)/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const period = m[3].replace(/\./g, "").toLowerCase();
  if (period === "pm" && hour !== 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;
  return { hour, minute };
}

const MONTH_PAT = `(?:January|February|March|April|May|June|July|August|September|October|November|December)`;
const TIME_PAT  = `\\d+:\\d+\\s*(?:a\\.m\\.|p\\.m\\.|am|pm)`;

function parseTitleDate(title) {
  let m;

  // 1. (Time-Time) Month Day, Year
  m = title.match(new RegExp(`\\((${TIME_PAT})-(${TIME_PAT})\\)\\s*(${MONTH_PAT})\\s+(\\d{1,2}),?\\s+(\\d{4})`, "i"));
  if (m) {
    const t1 = parseClockTime(m[1]), t2 = parseClockTime(m[2]);
    const month = parseMonthName(m[3]), day = parseInt(m[4], 10), year = parseInt(m[5], 10);
    if (t1 && t2 && month) {
      return {
        startDate: formatDatetime(year, month, day, t1.hour, t1.minute),
        parsedEndDate: formatDatetime(year, month, day, t2.hour, t2.minute),
        durationSeconds: (t2.hour * 60 + t2.minute - (t1.hour * 60 + t1.minute)) * 60,
      };
    }
  }

  // 2. (Between Time and Time) Month Day, Year
  m = title.match(new RegExp(`\\(Between\\s+(${TIME_PAT})\\s+and\\s+(${TIME_PAT})\\)\\s*(${MONTH_PAT})\\s+(\\d{1,2}),?\\s+(\\d{4})`, "i"));
  if (m) {
    const t1 = parseClockTime(m[1]), t2 = parseClockTime(m[2]);
    const month = parseMonthName(m[3]), day = parseInt(m[4], 10), year = parseInt(m[5], 10);
    if (t1 && t2 && month) {
      return {
        startDate: formatDatetime(year, month, day, t1.hour, t1.minute),
        parsedEndDate: formatDatetime(year, month, day, t2.hour, t2.minute),
        durationSeconds: (t2.hour * 60 + t2.minute - (t1.hour * 60 + t1.minute)) * 60,
      };
    }
  }

  // 3. (Time) Month Day, Year
  m = title.match(new RegExp(`\\((${TIME_PAT})\\)\\s*(${MONTH_PAT})\\s+(\\d{1,2}),?\\s+(\\d{4})`, "i"));
  if (m) {
    const t = parseClockTime(m[1]), month = parseMonthName(m[2]);
    const day = parseInt(m[3], 10), year = parseInt(m[4], 10);
    if (t && month) {
      return { startDate: formatDatetime(year, month, day, t.hour, t.minute), parsedEndDate: null, durationSeconds: null };
    }
  }

  // 4. Time Month Day, Year (no parens)
  m = title.match(new RegExp(`^[^:]*?(${TIME_PAT})\\s*(${MONTH_PAT})\\s+(\\d{1,2}),?\\s+(\\d{4})`, "i"));
  if (m) {
    const t = parseClockTime(m[1]), month = parseMonthName(m[2]);
    const day = parseInt(m[3], 10), year = parseInt(m[4], 10);
    if (t && month) {
      return { startDate: formatDatetime(year, month, day, t.hour, t.minute), parsedEndDate: null, durationSeconds: null };
    }
  }

  // 5. Month Day, Year
  m = title.match(new RegExp(`(${MONTH_PAT})\\s+(\\d{1,2}),?\\s+(\\d{4})`, "i"));
  if (m) {
    const month = parseMonthName(m[1]), day = parseInt(m[2], 10), year = parseInt(m[3], 10);
    if (month) return { startDate: formatDatetime(year, month, day), parsedEndDate: null, durationSeconds: null };
  }

  // 6. Month Year (no day)
  m = title.match(new RegExp(`(${MONTH_PAT})\\s+(\\d{4})`, "i"));
  if (m) {
    const month = parseMonthName(m[1]), year = parseInt(m[2], 10);
    if (month) return { startDate: formatDatetime(year, month, 1), parsedEndDate: null, durationSeconds: null };
  }

  // 7. Year-Year range — use start year
  m = title.match(/(\d{4})-(\d{4})/);
  if (m) return { startDate: formatDatetime(parseInt(m[1], 10)), parsedEndDate: null, durationSeconds: null };

  // 8. Bare four-digit year
  m = title.match(/\b(\d{4})\b/);
  if (m) return { startDate: formatDatetime(parseInt(m[1], 10)), parsedEndDate: null, durationSeconds: null };

  // 9. Decade notation e.g. "Early 1980s", "Mid-1980s"
  m = title.match(/\b(\d{3})0s\b/);
  if (m) return { startDate: formatDatetime(parseInt(m[1] + "0", 10)), parsedEndDate: null, durationSeconds: null };

  return { startDate: null, parsedEndDate: null, durationSeconds: null };
}

function transformNewsEntry(entry, sort, sourceId) {
  const { startDate, parsedEndDate, durationSeconds } = parseTitleDate(entry.title ?? "");

  const calcDuration =
    durationSeconds !== null && durationSeconds > 0 && durationSeconds < ONE_HOUR_SECONDS
      ? durationSeconds
      : DEFAULT_CALC_DURATION;

  const endDate = calcDuration > FIVE_MINUTES_SECONDS ? startDate : (parsedEndDate ?? startDate);

  return {
    title:         (entry.title ?? "").trim(),
    full_title:    (entry.full_title ?? "").trim(),
    source:        sourceId,
    start_date:    startDate,
    end_date:      endDate,
    calc_duration: calcDuration,
    timezone:      entry.tz ?? null,
    url:           entry.url ?? null,
    format:        "news",
    approved:      1,
    mute:          0,
    volume:        1,
    jump:          0,
    trim:          0,
    image:         entry.image || null,
    image_caption: entry.image_caption || null,
    content:       entry.content || null,
    sort,
  };
}

async function resolveNewsSource(token) {
  const existing = await api(token, "GET", "/items/sources?limit=-1&fields=id,slug");
  const found = existing.data.find((s) => s.slug === NEWS_SOURCE_NAME);
  if (found) {
    console.log(`Source "${NEWS_SOURCE_NAME}" already exists (id=${found.id}).`);
    return found.id;
  }
  console.log(`Creating source "${NEWS_SOURCE_NAME}"…`);
  const created = await api(token, "POST", "/items/sources", [{ name: NEWS_SOURCE_NAME, slug: NEWS_SOURCE_NAME }]);
  return created.data[0].id;
}

async function importNewsItems(token, records, sourceId) {
  const existingSort = await api(token, "GET", "/items/media_items?limit=1&sort[]=-sort&fields[]=sort");
  const maxSort = existingSort.data?.[0]?.sort ?? 0;

  const cols = `title,full_title,source,start_date,end_date,calc_duration,timezone,url,format,approved,mute,volume,jump,"trim",image,image_caption,content,sort`;
  const BATCH = 500;

  const transformed = records.map((entry, i) => transformNewsEntry(entry, maxSort + i + 1, sourceId));

  let skipped = 0;
  const valid = transformed.filter((r) => {
    if (!r.start_date) { skipped++; return false; }
    return true;
  });

  if (skipped > 0) console.warn(`Warning: ${skipped} news entries skipped — no parseable date in title.`);
  console.log(`Importing ${valid.length} news items in batches of ${BATCH}…`);

  for (let i = 0; i < valid.length; i += BATCH) {
    process.stdout.write(`  ${i + 1}–${Math.min(i + BATCH, valid.length)} / ${valid.length}\r`);
    const batch = valid.slice(i, i + BATCH);
    const rows = batch.map((r) => `(${[
      sqlVal(r.title),
      sqlVal(r.full_title),
      sqlVal(r.source),
      sqlVal(r.start_date),
      sqlVal(r.end_date),
      sqlVal(r.calc_duration),
      sqlVal(r.timezone),
      sqlVal(r.url),
      sqlVal(r.format),
      sqlVal(r.approved),
      sqlVal(r.mute),
      sqlVal(r.volume),
      sqlVal(r.jump),
      sqlVal(r.trim),
      sqlVal(r.image),
      sqlVal(r.image_caption),
      sqlVal(r.content),
      sqlVal(r.sort),
    ].join(",")})`).join(",\n");

    psql(`INSERT INTO media_items (${cols}) VALUES\n${rows};\n`);
  }

  console.log("\nDone.");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const mediaRecords = JSON.parse(readFileSync(MEDIA_DATA_PATH, "utf8"));
const newsRecords  = JSON.parse(readFileSync(NEWS_DATA_PATH,  "utf8"));
console.log(`Loaded ${mediaRecords.length} TV records from ${MEDIA_DATA_PATH}`);
console.log(`Loaded ${newsRecords.length} news records from ${NEWS_DATA_PATH}`);

const token = await getToken();
console.log("Authenticated.");

await createCollections(token);
await createRelations(token);

console.log("\n--- TV media items (entries_media.json) ---");
const sourceMap = await importSources(token, mediaRecords);
await importMediaItems(token, mediaRecords, sourceMap);

console.log("\n--- News items (entries_news.json) ---");
const newsSourceId = await resolveNewsSource(token);
await importNewsItems(token, newsRecords, newsSourceId);

console.log("\nBootstrap complete. Directus is at", DIRECTUS_URL);
