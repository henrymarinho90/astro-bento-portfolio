import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { resolveWebsiteContent } from '../src/lib/website-model.mjs';
const root = new URL('../', import.meta.url);
test('ROMA home introduces both named professionals without portraits or active LinkedIn embeds', () => {
 const path = new URL('src/components/roma/Home.astro', root);
 assert.equal(existsSync(path), true, 'ROMA home component must exist');
 const source = readFileSync(path, 'utf8');
 assert.match(source, /const site = await getWebsiteContent\(locale\)/);
 assert.match(source, /const \{[^}]*\bpeople\b[^}]*\} = site/);
 for (const [key, name] of [['tatiana', 'Tatiana Rodriguez'], ['henry', 'Henry Mariño']]) {
  const profile = source.match(new RegExp(`<article[^>]*data-professional="${key}"[^>]*>([\\s\\S]*?)</article>`))?.[1];
  assert.ok(profile, `${key} professional profile must exist`);
  assert.match(profile, new RegExp(`<h3>\\{people\\.${key}\\.name\\}</h3>`));
  assert.match(profile, new RegExp(`<div data-linkedin-slot="${key}" hidden></div>`));
  for (const locale of ['es', 'en']) {
   assert.equal(resolveWebsiteContent({}, locale).people[key].name, name, `${locale} approved ${key} identity`);
  }
 }
 assert.doesNotMatch(source, /avatarUrl|AVATAR_ID|<iframe|<img[^>]*portrait/);
 assert.match(source, /data-linkedin-slot/);
});
test('home service cards retain their professional ownership and approved territorial scope', () => {
 const source = readFileSync(new URL('src/components/roma/Home.astro', root), 'utf8');
 for (const [practice, person] of [['legal', 'tatiana'], ['data', 'henry']]) {
  const card = source.match(new RegExp(`<article class="practice practice-${practice}">([\\s\\S]*?)</article>`))?.[1];
  assert.ok(card, `${practice} service card must exist`);
  assert.match(card, new RegExp(`class="practice-person">\\{people\\.${person}\\.name\\}`));
  assert.match(card, new RegExp(`\\{practices\\.${practice}\\.card_items\\.map\\(`));
  assert.match(card, new RegExp(`/servicios/${practice}/`));
  assert.match(card, new RegExp(`<small>\\{practices\\.${practice}\\.territory\\}</small>`));
 }
 for (const locale of ['es', 'en']) {
  const { practices } = resolveWebsiteContent({}, locale);
  assert.equal(practices.legal.territory, locale === 'es'
   ? 'Servicios jurídicos exclusivamente en Colombia.' : 'Legal services exclusively in Colombia.');
  assert.equal(practices.data.territory, locale === 'es'
   ? 'Colombia y otros países de Latinoamérica.' : 'Colombia and other Latin American countries.');
  assert.deepEqual(practices.legal.card_items.map(item => item.label), locale === 'es'
   ? ['Derecho civil', 'Tierras e inmuebles', 'Derecho de familia'] : ['Civil law', 'Land and property', 'Family law']);
 }
});
test('shared shell exposes language alternatives, canonical, skip link and noindex preview switch', () => {
 const path = new URL('src/layouts/RomaLayout.astro', root);
 assert.equal(existsSync(path), true, 'ROMA shell must exist');
 const source = readFileSync(path, 'utf8');
 for (const token of ['hreflang','canonical','main-content','PUBLIC_NOINDEX','data-locale','roma_locale','Escape']) assert.ok(source.includes(token), token);
 assert.doesNotMatch(source, /datePublished:\s*new Date|Gianmarco|Henry Marinho/);
});
