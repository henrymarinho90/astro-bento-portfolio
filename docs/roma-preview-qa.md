# ROMA — local implementation and verification

## Preview

- Spanish: http://127.0.0.1:4321/es/
- English: http://127.0.0.1:4321/en/
- Blog/archive: `/es/blog/` and `/en/blog/`.
- Worktree: `C:/Users/Asus/Documents/GitHub/roma-consulting`, branch `rebrand/roma`.
- Production and Directus content have not been changed. No push/deployment was performed.

## Delivered scope

Astro + existing Directus read integration remain. The official ROMA brand assets/tokens drive the new editorial layout. Tatiana Rodriguez and Henry Mariño have equally presented professional areas; legal services are explicitly Colombia-only, data/AI services cover LATAM. No profile photographs or active LinkedIn embed is included. Henry's existing public profile link remains; embed slots are hidden pending later integration.

The ES/EN interface, practice pages and archive preserve the four actual CMS records and original long-form content. Existing `/project/<slug>/` URLs remain accessible and canonical; blog and localized aliases do not invent new articles, clients or results. Legacy `/travel/` is retained, outside this redesign's browser-test scope.

## Executed checks

- `npm test`: 29 passed, 0 failed.
- `npm run check`: 0 errors, 0 warnings, 4 legacy hints.
- `NODE_OPTIONS=--dns-result-order=ipv4first PUBLIC_NOINDEX=true npm run build`: completed, standalone Node adapter plus prerendered pages.
- Real isolated Chromium: 485 checks passed; 36 ROMA pages at 320, 390, 768, 1024, 1280 and 1920 CSS px. Unique H1, no document-wide horizontal overflow, preview noindex, mobile menu open/Escape/link close, desktop-resize scroll release, manual locale cookie/root redirect, original article/canonical, long word/table/image/code/iframe containment and no uncaught frontend JavaScript exceptions.
- Actual SSR HTTP: 4 routing/cache checks passed, including ignored spoofed country header while trust is disabled.
- `git diff --check`: passed.

Evidence: `qa-output/browser-results.json`, `qa-output/http-results.json`, and four PNGs in `qa-output/screenshots/`. Local generated evidence is intentionally gitignored. The independent targeted review of seven core source files passed with no security/logic blockers. Its verified verdict is preserved in `docs/roma-independent-review.json` (original local artifact: `qa-output/independent-review.json`). This review does not certify production infrastructure.

## Reproduce on this Windows workspace

Existing dependencies are available through a read-only directory junction to the original checkout's node_modules; no dependency installation or lockfile change was needed here.

```sh
npm test
npm run check
NODE_OPTIONS=--dns-result-order=ipv4first PUBLIC_NOINDEX=true npm run build
HOST=127.0.0.1 PORT=4321 node dist/server/entry.mjs
# Separate terminal; Python requires websocket-client:
python scripts/qa-headless.py
```

The headless runner launches Brave with an isolated temporary profile, tests CDP on loopback :9333 and terminates only its own browser tree. It never uses the user's logged-in profile. `qa-browser.py --cdp <endpoint>` also supports an existing Chromium endpoint. Layout probes wait for complete documents and stable viewport metrics; immediate post-CDP reads and requestAnimationFrame in a minimized window are not reliable evidence.

## Boundaries before production

- This is a localhost preview, not an online deployment. The build intentionally includes `noindex,nofollow`; rebuild without `PUBLIC_NOINDEX=true` for the authorized production release.
- Browser language detection is active. Real country/IP-based selection requires a trusted edge proxy, origin protection and explicit `TRUST_PROXY_COUNTRY=true`; it is deliberately disabled locally. See `locale-routing.md`.
- Tatiana's direct contact/LinkedIn URL still requires confirmation. Legal inquiries currently offer explicitly labeled initial coordination with Henry; no invented contact is used.
- External BI/dashboard availability and source HTTP embeds were not certified. Unsafe HTTP iframes are removed rather than silently rewritten to HTTPS. Original body text and safe resource links remain.
- CMS network failures fail the build instead of publishing an empty archive. A tested 20-second transport deadline prevents indefinite waits. IPv4-first resolved the observed Node connectivity stall on this machine; no CMS/server configuration was modified.
- Backup, production deployment, real trusted-proxy geography and rollback remain release tasks requiring authorization.
