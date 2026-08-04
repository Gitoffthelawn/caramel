# caramel-extension

Plain-JS Manifest V3 browser extension (Chrome/Edge/Firefox; Safari is packaged in release CI from `dist/` via `safari-web-extension-converter` — no in-repo Xcode project, see `.github/workflows/release-extension.yml`) — **no bundler**, every file loads verbatim as listed in `manifest.json` (Chrome/Edge) / `manifest-firefox.json` (Firefox).

**Setup:** root [README.md](../../README.md)'s Getting Started. This extension has no `.env` of its own.

Commands (from `apps/caramel-extension`, or prefix with `pnpm --filter caramel-extension` from the repo root):

| Command            | Does                                                                      |
| ------------------ | ------------------------------------------------------------------------- |
| `pnpm dev`         | Loads the extension into a `web-ext`-managed Chromium, live-reloading     |
| `pnpm build`       | Copies the allowlist in `scripts/build-dist.mjs` into `dist/` — see below |
| `pnpm package`     | Zips `dist/` into `extension.zip`                                         |
| `pnpm test`        | Unit tests (vitest)                                                       |
| `pnpm test:e2e`    | Real Chromium + the local app (`scripts/test-extension.mjs`)              |
| `pnpm test:guards` | Real Chromium + a production store config (`scripts/test-guards.mjs`)     |
| `pnpm size`        | Per-bundle byte budgets (`.size-limit.json`)                              |

## What ships

`pnpm build` copies an explicit **allowlist** (`scripts/build-dist.mjs`), not "everything minus a few excludes". The old rsync blacklist put `package.json`, the lint/knip/size configs, `tests/`, `scripts/` and ~400 KB of unreferenced brand art into the store package. `tests/package-contents.test.mjs` derives the requirement from the manifests and `index.html`, so adding a file to the extension and forgetting the allowlist is a red test rather than a broken release.

To check the packaged output rather than the source tree:

```sh
pnpm build && CARAMEL_EXT_DIR=./dist pnpm test:guards
```

## Byte budgets

`.size-limit.json` caps each bundle. The injected content-script budget moved 106 → 124 → **126 KB** on 2026-08-04: first for the bad-config safety guards (`4c7466a..4660064`), then for the multi-price post-apply total read and the shadow-CSS fetch timeout. All of it is correctness code proved necessary in a real browser — raise the budget rather than trim it, and say why here.

**Manual load-unpacked** (no `web-ext`): `chrome://extensions` → enable Developer mode → **Load unpacked** → select `apps/caramel-extension`.

Content-script constants shared with `caramel-app` are generated — regenerate via `pnpm --filter caramel-app generate:coupon-constants`, never hand-edit `coupon-constants.generated.js`. Safari icon generation is CI-only — see the root README's Safari Extension Icons section.
