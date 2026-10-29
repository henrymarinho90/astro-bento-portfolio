import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { locales, chooseLocale, localePath, otherLocale, localizedEquivalent } from '../src/lib/i18n.mjs';

// Exercise the actual root frontmatter with web-standard request/response objects,
// without needing Astro, a running CMS, or a production environment.
async function rootRedirect({ cookie, headers = {}, env = {} } = {}) {
  const source = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  assert.match(source, /export\s+const\s+prerender\s*=\s*false/);
  assert.match(source, /import\s*\{[^}]*chooseLocale[^}]*\}\s*from\s*['"]\.\.\/lib\/i18n\.mjs['"]/);
  assert.doesNotMatch(source, /directus|getPublishedProjects|<img|<iframe/i);
  const frontmatter = source.split('---')[1]
    .replace(/^import\s+.*?;\s*$/gm, '')
    .replace(/export\s+const\s+prerender\s*=\s*false\s*;/, '')
    .replaceAll('import.meta.env', 'env');
  const Astro = {
    request: new Request('https://roma.example/', { headers }),
    cookies: { get: (name) => name === 'roma_locale' && cookie !== undefined ? { value: cookie } : undefined },
    redirect: (location, status) => new Response(null, { status, headers: { Location: location } }),
  };
  return new Function('Astro', 'chooseLocale', 'localePath', 'env', frontmatter)(Astro, chooseLocale, localePath, env);
}

test('supported locales are Spanish and English; Spanish is the safe default', () => {
  assert.deepEqual(locales, ['es', 'en']);
  assert.equal(chooseLocale(), 'es');
  assert.equal(chooseLocale({}), 'es');
  assert.equal(chooseLocale({ acceptLanguage: 'fr, de;q=0.8' }), 'es');
});

test('only a valid saved cookie overrides country and browser preference', () => {
  assert.equal(chooseLocale({ cookie: 'en', country: 'CO', acceptLanguage: 'es' }), 'en');
  assert.equal(chooseLocale({ cookie: 'es', country: 'US', acceptLanguage: 'en' }), 'es');
  for (const cookie of ['EN', ' en ', 'fr', '//evil.example', 'en; path=/', '', null]) {
    assert.equal(chooseLocale({ cookie, country: 'CO', acceptLanguage: 'en' }), 'es');
  }
});

test('trusted Spanish-speaking country signals beat browser preference', () => {
  for (const country of ['AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GT', 'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'PR', 'UY', 'VE', 'ES']) {
    assert.equal(chooseLocale({ country, acceptLanguage: 'en-US,en;q=0.9' }), 'es', country);
  }
  assert.equal(chooseLocale({ country: ' co ', acceptLanguage: 'en' }), 'es');
});

test('known English-speaking signals select English, not every non-LATAM country', () => {
  for (const country of ['US', 'GB', 'CA', 'AU', 'NZ', 'IE']) {
    assert.equal(chooseLocale({ country, acceptLanguage: 'es' }), 'en', country);
  }
  for (const country of ['FR', 'DE', 'BR', 'JP', 'XX', 'T1', 'USA', undefined]) {
    assert.equal(chooseLocale({ country, acceptLanguage: 'es-MX' }), 'es');
    assert.equal(chooseLocale({ country, acceptLanguage: 'en-GB' }), 'en');
    assert.equal(chooseLocale({ country }), 'es');
  }
});

test('Accept-Language honors weights, regional tags, zero weights and header order ties', () => {
  for (const [acceptLanguage, expected] of [
    ['es;q=0.4,en-US;q=0.9', 'en'],
    ['en;q=0.1,es-CO;q=0.8', 'es'],
    ['fr-FR, EN-gb ; q=0.7, es;q=0.2', 'en'],
    ['en,es', 'en'],
    ['es,en', 'es'],
    ['en;q=0,es;q=0.2', 'es'],
    ['es;q=0,en;q=0.2', 'en'],
    ['en;q=bogus,es;q=0.3', 'es'],
    ['en;q=1.1,es;q=0.3', 'es'],
    ['en;q=-1,es;q=0.3', 'es'],
    ['en;q=0.1234,es;q=0.3', 'es'],
    ['*,fr;q=0.9', 'es'],
    ['english,es;q=0.5', 'es'],
    ['', 'es'],
  ]) assert.equal(chooseLocale({ acceptLanguage }), expected, acceptLanguage);
});

test('path utilities preserve the equivalent route and normalize a single locale prefix', () => {
  assert.equal(localePath('es'), '/es/');
  assert.equal(localePath('en', '/project/example'), '/en/project/example/');
  assert.equal(localePath('en', '/es/project//example/'), '/en/project/example/');
  assert.equal(localePath('es', 'project/./old/../example'), '/es/project/example/');
  assert.equal(localePath('en', '/project/caf%C3%A9?preview=true#details'), '/en/project/caf%C3%A9/');
  assert.equal(otherLocale('es'), 'en');
  assert.equal(otherLocale('en'), 'es');
  assert.equal(localizedEquivalent('/es/project/example/', 'en'), '/en/project/example/');
  assert.equal(localizedEquivalent('/en/project/example/', 'es'), '/es/project/example/');
  assert.equal(localizedEquivalent('/project/example/', 'en'), '/en/project/example/');
  assert.equal(localizedEquivalent('/en/', 'es'), '/es/');
  assert.equal(localizedEquivalent('/', 'en'), '/en/');
});

test('unsafe locale/path values cannot produce external or unprefixed destinations', () => {
  for (const path of ['https://evil.example/x', '//evil.example/x', '\\evil.example\\x', '/%2f%2fevil.example', '/%5cevil', '/bad%ZZ', '/x\r\nLocation: evil']) {
    assert.equal(localePath('en', path), '/en/', path);
  }
  assert.equal(localePath('en', '/../../outside'), '/en/outside/');
  assert.equal(localePath('//evil.example', '/project/example'), '/es/project/example/');
  assert.equal(localizedEquivalent('/en/project/example', '../../evil'), '/es/project/example/');
});

test('malformed Unicode paths fail safely instead of breaking manual navigation', () => {
  assert.equal(localePath('en', '/project/\uD800'), '/en/');
  assert.equal(localizedEquivalent('/es/\uDC00', 'en'), '/en/');
});

test('root responds with a private, non-cacheable 302 and no CMS query', async () => {
  const response = await rootRedirect({ headers: { 'Accept-Language': 'en-US' } });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Location'), '/en/');
  assert.match(response.headers.get('Cache-Control'), /private/);
  assert.match(response.headers.get('Cache-Control'), /no-store/);
  const vary = response.headers.get('Vary').toLowerCase().split(',').map((value) => value.trim());
  assert.ok(vary.includes('cookie'));
  assert.ok(vary.includes('accept-language'));
  assert.ok(vary.includes('cf-ipcountry'));
  assert.equal(response.headers.get('Set-Cookie'), null);
});

test('root ignores spoofable country headers unless cf-ipcountry trust is explicitly enabled', async () => {
  for (const env of [{}, { TRUST_PROXY_COUNTRY: 'false' }, { TRUST_PROXY_COUNTRY: 'TRUE' }, { TRUST_PROXY_COUNTRY: true }]) {
    const response = await rootRedirect({ headers: { 'cf-ipcountry': 'CO', 'Accept-Language': 'en' }, env });
    assert.equal(response.headers.get('Location'), '/en/');
  }
  const trusted = await rootRedirect({ headers: { 'cf-ipcountry': 'CO', 'Accept-Language': 'en' }, env: { TRUST_PROXY_COUNTRY: 'true' } });
  assert.equal(trusted.headers.get('Location'), '/es/');
  const arbitrary = await rootRedirect({ headers: { 'x-country': 'US', 'x-vercel-ip-country': 'US', 'Accept-Language': 'es' }, env: { TRUST_PROXY_COUNTRY: 'true' } });
  assert.equal(arbitrary.headers.get('Location'), '/es/');
});

test('root respects the manual cookie and falls back to Spanish on missing or invalid signals', async () => {
  const response = await rootRedirect({ cookie: 'en', headers: { 'cf-ipcountry': 'CO', 'Accept-Language': 'es' }, env: { TRUST_PROXY_COUNTRY: 'true' } });
  assert.equal(response.headers.get('Location'), '/en/');
  assert.equal((await rootRedirect()).headers.get('Location'), '/es/');
  assert.equal((await rootRedirect({ cookie: '//evil.example' })).headers.get('Location'), '/es/');
});
