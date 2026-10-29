import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
const root = new URL('../', import.meta.url);
test('ROMA home introduces both named professionals without portraits or active LinkedIn embeds', () => {
 const path = new URL('src/components/roma/Home.astro', root);
 assert.equal(existsSync(path), true, 'ROMA home component must exist');
 const source = readFileSync(path, 'utf8');
 assert.match(source, /Tatiana Rodriguez/);
 assert.match(source, /Henry Mariño/);
 assert.doesNotMatch(source, /avatarUrl|AVATAR_ID|<iframe|<img[^>]*portrait/);
 assert.match(source, /data-linkedin-slot/);
});
test('shared shell exposes language alternatives, canonical, skip link and noindex preview switch', () => {
 const path = new URL('src/layouts/RomaLayout.astro', root);
 assert.equal(existsSync(path), true, 'ROMA shell must exist');
 const source = readFileSync(path, 'utf8');
 for (const token of ['hreflang','canonical','main-content','PUBLIC_NOINDEX','data-locale','roma_locale','Escape']) assert.ok(source.includes(token), token);
 assert.doesNotMatch(source, /datePublished:\s*new Date|Gianmarco|Henry Marinho/);
});
