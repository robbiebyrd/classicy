# Classicy Example App

A standalone Vite + React application that demonstrates the Classicy component library. It is part of the pnpm workspace and consumes the local `classicy` package directly (via the `workspace:*` dependency) — no linking step required.

## Setup

The example app runs against the **locally built** library by default (it resolves `classicy` through the pnpm workspace). It can optionally be pointed at the **published npm package** instead (for trying out the example standalone).

### Using the local build

From the **repository root** (this project uses [pnpm](https://pnpm.io/); run `corepack enable` first if needed):

```sh
pnpm install
pnpm preview
```

This builds the library and starts the example dev server. Then open http://localhost:5173 in your browser.

For iterative development, run `pnpm build:watch` in the root (rebuilds on file changes), then in this directory:

```sh
pnpm dev   # start the Vite dev server (already resolving the local workspace build)
```

### Using the published package

To point the example at the latest published version of `classicy` on npm instead of the workspace build:

```sh
cd example
pnpm run use:published   # replaces the workspace dependency with classicy@latest
pnpm dev
```

To switch back to the local workspace build at any time:

```sh
pnpm run use:local
```

## Applications

The example desktop includes the following apps. Click any desktop icon or use the Apple menu to open them.

### Demo
An interactive showcase of every Classicy UI component — buttons, checkboxes, radio inputs, text fields, spinners, pop-up menus, progress bars, balloon help tooltips, tabs, and disclosure sections. Start here to explore what the library offers.

### Browser
A retro web browser powered by the [TimeMachine Web Proxy](https://hub.docker.com/r/robbiebyrd/time-machine-proxy). Fetches archived snapshots of websites from the Wayback Machine and renders them in a Mac OS 8-style browser window with back/forward navigation and a favorites bar.

**Requires the TimeMachine proxy** — see [TimeMachine Proxy Setup](#timemachine-proxy-setup) below.

### News
A news reader that displays historical news entries from a local JSON dataset (`entries.json`). Supports thumbnail and full-article views with pagination.

### EPG
An Electronic Program Guide rendered as a scrollable channel/time grid. Loads program data from a local JSON file and displays show titles, descriptions, and icons in a classic TV guide layout.

### TV
A multi-channel streaming TV player. Displays a scrollable strip of video thumbnails at the bottom; clicking a channel expands it to fill the main area. All streams stay mounted to preserve playback state.

### Pager Decoder
A live POCSAG/FLEX pager message decoder. Connects to a pager index feed, streams decoded messages in real time, and supports filtering by address, source, and message content.

### BlueBox (Infinite Mac)
Embeds [Infinite Mac](https://infinitemac.org) — a browser-based emulator running Mac OS 8.1 on a Quadra 650 — inside a Classicy window.

### SimpleText
A basic rich-text editor backed by the `ClassicyRichTextEditor` component, included from the core library.

---

## TimeMachine Proxy Setup

The **Browser** app requires the TimeMachine Web Proxy to be running locally. A Docker Compose configuration is provided in `timemachine/`.

**Prerequisites:** Docker with Compose support.

```sh
cd timemachine
cp .env.example .env   # review and adjust settings if needed
docker compose up -d
```

The proxy starts on `http://localhost:8765`. Once it is running, open the Browser app and enable the proxy under **File → Settings → Enable TimeMachine Proxy**.

### Configuration

| Variable | Default | Description |
|---|---|---|
| `TIMEMACHINE_PORT` | `8765` | Host port the proxy listens on |
| `LISTENER` | `0.0.0.0` | Bind address inside the container (must stay `0.0.0.0`) |
| `ARCHIVE_TIME` | `20010911000000` | Wayback Machine timestamp to retrieve (YYYYMMDDHHmmss) |
| `URL_PREFIX` | `https://web.archive.org/web` | Archive source base URL |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed origin — must match your dev server address |
| `CACHE_ENABLED` | `true` | Cache fetched pages to disk |
| `HOST_CACHE_DIR` | *(unset)* | Host path to persist the cache; leave unset for a Docker volume |
| `CACHE_CLEAR_TOKEN` | `dev-token` | Token for the cache-clear endpoint — change for shared deployments |

To stop the proxy:

```sh
docker compose down
```
