// Runs AFTER `npm run build` (npm run test:dist). Fails, never skips, when dist/ is missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { sitemapFilter } from '../../src/lib/seo.mjs';

const root = new URL('../../dist/client/', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const origin = 'https://portfolio.romahomestore.com';

test('dist/ exists (run `npm run build` first)', () => {
  assert.ok(existsSync(new URL('sitemap-0.xml', root)), 'dist/client/sitemap-0.xml missing: build first');
});

test('built sitemap has no duplicates and covers es and en services', () => {
  const locs = [...read('sitemap-0.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(new Set(locs).size, locs.length);
  assert.ok(locs.every(sitemapFilter));
  for (const l of ['es', 'en']) for (const s of ['legal', 'data']) assert.ok(locs.includes(`${origin}/${l}/servicios/${s}/`));
});

test('built article has hreflang and canonical', () => {
  const built = read('en/blog/analisis-autos-usa/index.html');
  for (const l of ['es', 'en', 'x-default']) assert.ok(built.includes(`hreflang="${l}"`), l);
  assert.ok(built.includes(`rel="canonical" href="${origin}/en/blog/analisis-autos-usa/"`));
});

test('built pages: GTM with consent default first (Consent Mode advanced), never gtag.js; previews ship nothing', () => {
  for (const p of ['es/index.html', 'en/index.html', 'es/blog/analisis-autos-usa/index.html']) {
    const html = read(p);
    assert.ok(!/gtag\/js/.test(html), `${p}: no direct gtag.js`);
    assert.ok(!/<script[^>]+src=["'][^"']*googletagmanager/.test(html), `${p}: GTM is injected by the official snippet, never a static <script src>`);
    assert.ok(!/<link[^>]+googletagmanager/.test(html), `${p}: no preload/preconnect to Google`);
    const preview = /<meta name="robots" content="noindex/.test(html);
    if (preview) {
      assert.ok(!html.includes('googletagmanager'), `${p}: PUBLIC_NOINDEX preview ships no GTM`);
      continue;
    }
    const iDefault = html.indexOf("gtag('consent','default'");
    const iGtm = html.indexOf('googletagmanager.com/gtm.js');
    assert.ok(iDefault > 0 && iGtm > iDefault, `${p}: consent default before gtm.js`);
    assert.ok(html.includes('"analytics_storage":"denied","ad_storage":"denied","ad_user_data":"denied","ad_personalization":"denied"'), p);
    assert.ok(html.includes("'dataLayer',\"GTM-WQ4LMT9T\""), `${p}: container GTM-WQ4LMT9T`);
    assert.ok(html.indexOf('gtm.js') < html.indexOf('<title>'), `${p}: GTM high in <head>`);
    assert.match(html, /<body[^>]*>\s*<noscript><iframe src="https:\/\/www\.googletagmanager\.com\/ns\.html\?id=GTM-WQ4LMT9T"/, `${p}: noscript right after <body>`);
    assert.ok(!html.includes('G-BQD50XSC22'), `${p}: GA4 lives in GTM, not in the page`);
  }
});
