# VIEWPORT

**Every screen. One view.**

VIEWPORT is a responsive website testing studio that runs entirely in the browser. Enter a URL, see the site rendered in multiple real device viewports at the same time, explore breakpoints, capture screenshots and compare layouts — without resizing windows or switching devices.

- **Live app:** https://viewport.naerdev.ch
- **Workspace:** https://viewport.naerdev.ch/workspace

---

## Why it exists

Testing a responsive layout usually means dragging a browser window, opening devtools, resizing, and repeating. That shows one viewport at a time and destroys the context of how several screens relate to each other.

VIEWPORT keeps every target viewport visible at once. Each preview is an independent, interactive browser frame loaded at an exact CSS viewport size — not a mockup, not a screenshot, not a simulation.

---

## Features

### Live previews
- One, two, three or four (up to eight) independent iframes pointing at the same URL by default.
- Each preview has its own reload, orientation, fullscreen, screenshot, external-open and remove controls.
- Physical frames, not rounded rectangles: titanium phone bodies with a Dynamic Island and side buttons, aluminium tablets, laptops with a chin and camera. Bezel proportions are in device pixels, so they stay correct at every zoom level.
- Independent loading state per frame. A frame a site refuses to show names the actual rule (`X-Frame-Options: DENY`, `SAMEORIGIN`, CSP `frame-ancestors`) instead of leaving blank white space.
- Scrolling, clicking and typing work inside each preview wherever the embedded site permits it.

### Device library
- 21 presets across phones, tablets, laptops and desktop.
- Accurate **CSS viewport** dimensions (`window.innerWidth`/`innerHeight`), not physical panel resolution.
- Pixel ratio stored for reference, plus a category and orientation for every device.
- Portrait/landscape switching per preview.
- Custom devices: name, width, height, pixel ratio, orientation and frame style, saved locally.

### Workspace layouts
- **Grid** — automatic, balanced columns.
- **Horizontal** — one row of equal columns.
- **Vertical** — a scrolling stack.
- **Freeform** — drag previews anywhere and resize them from the corner.
- **Focus** — a single preview, given the whole canvas.
- Zoom: fit-to-pane or fixed 25–100 %, applied consistently for comparison.

### Breakpoint explorer
- A horizontal rail rendering the site at 375, 390, 430, 640, 768, 1024, 1280 and 1440 px simultaneously.
- Add, remove and edit breakpoints.
- A continuous width slider: drag it to reflow the selected breakpoint in real time at 1 px precision.
- Configurable preview height and a ruler with common breakpoint marks.

### Screenshots and comparison
- Capture any preview, or all of them at once.
- Comparison studio: side by side, overlay with an opacity slider, or a difference map with a changed-pixel percentage.
- PNG download for every capture and for the diff, with configurable filename prefix.
- Captures are **real pixels from your display**, taken through the browser's display-capture API and cropped to the preview. This works for cross-origin sites that cannot be rasterised from JavaScript, and the UI says exactly that.

### Synchronisation
- **Input mirroring** — press a button, type in a field or move the scroll position in one preview and every other preview of the same page does the same. The devices never drift apart: same tab open, same text typed, same counter. See [Honest limits](#honest-limits) for why this needs a same-origin page.
- **Navigation sync** — a new URL loads everywhere (it can also target a single preview).
- **Reload all** — one action (or ⌘/Ctrl + R) refreshes every frame; individual reloads stay individual.
- **Scroll sync** — mirrors scroll position between previews, only where the browser allows reading a frame's scroll position (same-origin documents). Cross-origin frames are labelled "No sync" instead of silently doing nothing.

### Sessions and sharing
- Saved workspaces in `localStorage`: URL, devices, dimensions, layout, zoom and sync settings.
- Recently tested URLs.
- Share links encode the configuration only (base64url in the URL hash-free query). No captured images, cookies, tokens or credentials are ever included.
- No account required.

### Keyboard-first
| Shortcut | Action |
| --- | --- |
| `⌘/Ctrl + K` | Focus the URL input |
| `⌘/Ctrl + R` | Reload every preview |
| `⌘/Ctrl + S` | Save the current workspace |
| `1` | Single preview (focus mode) |
| `2` / `3` | Two / three-column layout |
| `4` | Grid layout |
| `F` | Fullscreen the selected preview |
| `B` | Toggle breakpoint explorer |
| `G` | Toggle device library |
| `Esc` | Close panels and dialogs |
| `?` | Shortcut reference |

---

## Tech stack

| Layer | Choice | Reason |
| --- | --- | --- |
| UI | React 19 + TypeScript | Component model fits a multi-pane workspace; strict types guard the preview state machine. |
| Build | Vite 6 | Fast dev server, deterministic static output, no server runtime needed. |
| State | Zustand (with `persist`) | Small store with selective subscriptions so a store update does not re-render every iframe. |
| Icons | Lucide | Consistent, restrained icon set. |
| Styling | Hand-written CSS with design tokens | Full control over a bespoke dark interface; no utility-class noise in complex frame markup. |
| Hosting | Vercel (static) | Global CDN for an entirely client-side app. DNS on Cloudflare. |

No backend, no database, no analytics, no third-party scripts.

---

## Getting started

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev        # http://localhost:3003
```

Production build:

```bash
npm run build      # type-check + bundle into dist/
npm run preview    # serve the production bundle locally
```

Quality checks:

```bash
npm run typecheck  # tsc --noEmit
```

---

## Project structure

```
public/
  demo/index.html        # built-in sample site used for first-run previews and the landing demo
  favicon.svg
src/
  main.tsx               # entry point + style imports
  App.tsx                # tiny path router (landing vs workspace)
  pages/
    Landing.tsx          # marketing page with a live three-device demo
    Workspace.tsx        # workspace orchestration: layouts, capture, shortcuts
  components/
    TopBar.tsx           # URL bar, presets, zoom, layouts, sync, share
    PreviewPane.tsx      # one live frame: hardware body, scaling, health, mirroring, drag
    DeviceLibrary.tsx    # preset drawer
    BreakpointView.tsx   # breakpoint rail + live width slider
    ComparePanel.tsx     # capture comparison studio
    CustomDeviceDialog.tsx
    SessionsPanel.tsx
    SettingsPanel.tsx
    ShortcutsDialog.tsx
    ui.tsx               # buttons, popovers, modal, switch, toasts
api/
  frame-check.js         # reads X-Frame-Options / CSP so a blank frame can be explained
src/
  lib/
    types.ts             # domain types
    devices.ts           # device preset library
    store.ts             # workspace state, persistence, sessions, share config
    capture.ts           # display capture + image diff
    sync.ts              # same-origin scroll synchronisation
    mirror.ts            # click/type/key replay between same-origin previews
    frameHealth.ts       # embedding-policy check for a preview URL
    router.ts            # pushState router
    utils.ts             # URL normalisation, sharing codec, helpers
  styles/
    base.css             # tokens + primitives + app shell
    workspace.css        # panes, frames, panels, breakpoints, compare
    landing.css          # landing page
    utilities.css        # states, fullscreen, misc
```

---

## Architecture notes

### Preview engine
`PreviewPane` owns a single iframe and nothing else knows about it. Device frame, scale and chrome are pure CSS around a fixed-size iframe (`width`/`height` in CSS pixels, scaled with `transform`), so the embedded page always lays out at the requested viewport size. Zoom never changes the page's viewport — only how it is displayed.

Scale is computed from a `ResizeObserver` on the pane when zoom is "fit"; fixed zoom bypasses measurement so multiple previews can be compared at identical scale.

Reloading uses a `nonce` in the iframe `key`, which remounts exactly one frame. State outside that pane is untouched.

### State
A single Zustand store holds the workspace (`url`, `previews[]`, layout, zoom, sync flags, breakpoints, custom devices, sessions). Transient UI (open popover, drag rectangle, loaded state) is local component state. `persist` writes the durable slice to `localStorage` under `viewport.workspace.v1`; captures and open panels are deliberately excluded.

### Capture
There is no way to rasterise a cross-origin iframe from JavaScript — `canvas` would be tainted. Instead VIEWPORT calls `getDisplayMedia` once, then crops each preview's on-screen rectangle out of the captured tab. That yields genuine rendered pixels for any embeddable site, at display resolution. The trade-off (a permission prompt, and output resolution following the display) is stated in the UI rather than hidden.

The difference map draws both captures into equally sized canvases, compares luminance per pixel and highlights changed areas. It is an approximate visual diff, not a pixel-perfect regression baseline, and is labelled as such.

### Honest limits
- **Framing policies.** `X-Frame-Options: DENY/SAMEORIGIN` and CSP `frame-ancestors` stop embedding. A browser gives the host page no signal at all when this happens — the frame simply stays empty — so VIEWPORT reads the headers from its own `/api/frame-check` endpoint and names the rule that applies. Nothing is proxied and no header is rewritten; the site is explained, not bypassed.
- **Input mirroring.** A browser exposes the DOM of a same-origin frame only. Click, typing and key replay therefore works between previews of a page on VIEWPORT's own origin (the built-in `/demo/` and anything else on this host) and is impossible for a cross-origin site — no tool can dispatch a real click into a frame it cannot script. Those previews show "No mirror" rather than silently doing nothing, and the sample site is interactive so the behaviour can be seen.
- **Scroll sync.** Browsers do not expose scroll offsets of cross-origin frames. Sync is applied only to same-origin documents; every other preview shows a "No sync" indicator with an explanation.
- **Full-page screenshots.** Not possible for cross-origin embeds without a server-side browser. VIEWPORT captures what is visible instead of claiming otherwise.
- **Device pixel ratio.** A preview runs on the host display; the recorded DPR is a reference value.

---

## Deployment

The app is a static bundle plus one tiny serverless function. On Vercel: framework **Vite**, build command `npm run build`, output directory `dist`, `vercel.json` rewrites all non-asset paths to `index.html` for the `/workspace` route, and `api/frame-check.js` is deployed as a Node function that performs a single `HEAD` request to read framing headers. It refuses loopback and private hosts, returns no response body, and is cached for ten minutes.

DNS: `viewport.naerdev.ch` is a DNS-only CNAME to Vercel's edge, configured in the existing Cloudflare zone for `naerdev.ch`. No other records in that zone are modified.

To deploy your own copy:

```bash
npm run build
npx vercel deploy --prod   # or connect the repository in the Vercel dashboard
```

---

## Privacy

- No accounts, no cookies, no tracking, no analytics. The app writes no logs and sends nothing anywhere on its own.
- Previewing a URL loads that URL, exactly as a normal browser tab would.
- One extra request goes to VIEWPORT's own `/api/frame-check` endpoint for each new URL. It asks that same URL for its `X-Frame-Options` / `frame-ancestors` headers, because a browser gives the host page no signal when a site refuses to be embedded. The function receives the URL, returns headers only, never downloads a response body, refuses loopback and private hosts, and the answer is cached for ten minutes. Nothing is stored and no third party is involved.
- Saved workspaces, custom devices and history live in your browser's `localStorage`.
- Share links contain configuration only. Review a link before sending it if your workspace URL itself is private.
- Secret material is never stored in the repository; `.env` files are ignored.

---

## Known limitations

- Sites that block embedding cannot be previewed; they open in a new tab instead.
- Screenshots require display-capture support (Chrome, Edge or Safari on HTTPS) and one permission grant per session.
- Input mirroring and scroll sync are same-origin only, for browser security reasons.
- Freeform positions are per-workspace and reset when you change layout away from freeform and back.
- Very heavy sites load more slowly in several simultaneous frames; every preview loads independently and reports its own state.

---

## Status

Built and maintained as an independent developer tool. Device names are trademarks of their respective owners and are used only to describe viewport sizes.
