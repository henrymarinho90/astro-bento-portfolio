import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runContentCli } from '../scripts/content.mjs';
import { websiteCollections } from '../src/lib/website-model.mjs';

// All write values and server responses below are explicitly synthetic unit fixtures.
const token = 'synthetic-private-token-never-output';
function harness(env = {}, responder = async () => ({ ok: true, status: 200, json: async () => ({ data: { hero_title: 'Synthetic response' } }) })) {
  const calls = [], lines = [];
  return { calls, lines, options: { env, stdout: line => lines.push(line), fetcher: async (...args) => { calls.push(args); return responder(...args); } } };
}
const output = h => JSON.parse(h.lines.join('\n'));

test('import is inert; direct invocation works without starting network requests', () => {
  const path = fileURLToPath(new URL('../scripts/content.mjs', import.meta.url));
  const imported = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(new URL('../scripts/content.mjs', import.meta.url).href)})`], { encoding: 'utf8' });
  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(imported.stdout, '');
  const direct = spawnSync(process.execPath, [path, 'list', 'home'], { encoding: 'utf8' });
  assert.equal(direct.status, 0, direct.stderr);
  assert.equal(JSON.parse(direct.stdout)[0].collection, 'website_home');
});

test('list exposes modules, exact known IDs and editable field descriptors without network', async () => {
  const h = harness();
  await runContentCli(['list'], h.options);
  assert.equal(h.calls.length, 0);
  assert.deepEqual(output(h).map(m => m.alias), websiteCollections.map(m => m.alias));
  const one = harness();
  await runContentCli(['list', 'home'], one.options);
  assert.deepEqual(output(one)[0].records.map(r => r.id), ['es', 'en']);
  assert.ok(output(one)[0].fields.some(f => f.key === 'hero_title'));
});

test('set defaults to exact one-field dry run, treating scalar JSON-looking input literally', async () => {
  for (const value of ['Synthetic headline', '123', '{"label":"synthetic"}']) {
    const h = harness({ CONTENT_CMS_URL: 'invalid unused URL' });
    await runContentCli(['set', 'home', 'es', 'hero_title', value], h.options);
    assert.deepEqual(output(h), { mode: 'dry-run', collection: 'website_home', id: 'es', patch: { hero_title: value } });
    assert.equal(h.calls.length, 0);
  }
});

test('list values alone parse JSON and use model validation before any network', async () => {
  const h = harness();
  await runContentCli(['set', 'people', 'es-henry', 'tools', '[{"name":"Synthetic tool"}]'], h.options);
  assert.deepEqual(output(h).patch, { tools: [{ name: 'Synthetic tool' }] });
  for (const value of ['not json', '{"name":"synthetic"}', '[{"unexpected":"synthetic"}]']) {
    const bad = harness();
    await assert.rejects(runContentCli(['set', 'people', 'es-henry', 'tools', value], bad.options));
    assert.equal(bad.calls.length, 0);
  }
});

test('CLI rejects unknown module/ID/field, metadata, bad values, arity and flags before network', async () => {
  const cases = [[], ['oops'], ['list', 'unknown'], ['list', 'home', 'extra'],
    ['get', 'home', 'unknown', 'hero_title'], ['get', 'home', 'es', '*'], ['get', 'home', 'es', 'record_label'],
    ['get', 'home', 'es', 'hero_title', 'extra'], ['get', 'home', 'es', 'hero_title', '--apply'],
    ['set', 'home', 'es', 'hero_title'], ['set', 'home', 'es', 'hero_title', ''],
    ['set', 'home', 'es', 'status', 'published'], ['set', 'home', 'es', 'hero_title', 'Synthetic', '--force'],
    ['set', 'home', 'es', 'hero_title', 'Synthetic', '--apply', 'extra'],
    ['set', 'globals', 'global', 'header_logo', 'javascript:synthetic()']];
  for (const args of cases) {
    const h = harness();
    await assert.rejects(runContentCli(args, h.options), undefined, args.join(' '));
    assert.equal(h.calls.length, 0);
  }
});

test('apply requires private token before network and never accepts PUBLIC token', async () => {
  for (const env of [{}, { PUBLIC_DIRECTUS_TOKEN: token }, { DIRECTUS_CONTENT_TOKEN: '  ' }]) {
    const h = harness(env);
    await assert.rejects(runContentCli(['set', 'home', 'es', 'hero_title', 'Synthetic', '--apply'], h.options), /DIRECTUS_CONTENT_TOKEN/);
    assert.equal(h.calls.length, 0);
  }
});

test('apply performs exactly one narrow PATCH; no read, retry or server body/token output', async () => {
  const h = harness({ DIRECTUS_CONTENT_TOKEN: token }, async () => ({ ok: true, status: 200, json: () => { throw Error('Must not read mutation response'); } }));
  await runContentCli(['set', 'home', 'es', 'hero_title', 'Synthetic', '--apply'], h.options);
  assert.equal(h.calls.length, 1);
  const [url, request] = h.calls[0];
  assert.equal(new URL(url).pathname, '/items/website_home/es');
  assert.equal(request.method, 'PATCH');
  assert.deepEqual(JSON.parse(request.body), { hero_title: 'Synthetic' });
  assert.equal(request.headers.Authorization, `Bearer ${token}`);
  assert.equal(request.redirect, 'error');
  assert.ok(request.signal instanceof AbortSignal);
  assert.deepEqual(output(h), { mode: 'applied', collection: 'website_home', id: 'es', patch: { hero_title: 'Synthetic' } });
  assert.ok(!h.lines.join('').includes(token));
});

test('get requests only one whitelisted field and outputs only that field, anonymous or private', async () => {
  for (const env of [{}, { DIRECTUS_CONTENT_TOKEN: token }]) {
    const h = harness(env, async () => ({ ok: true, status: 200, json: async () => ({ data: { hero_title: 'Synthetic response', secret: 'must not print' } }) }));
    await runContentCli(['get', 'home', 'es', 'hero_title'], h.options);
    assert.equal(h.calls.length, 1);
    const [url, request] = h.calls[0];
    assert.equal(new URL(url).search, '?fields=hero_title');
    assert.equal(request.method, 'GET');
    assert.equal(request.redirect, 'error');
    assert.equal(Boolean(request.headers.Authorization), Boolean(env.DIRECTUS_CONTENT_TOKEN));
    assert.deepEqual(output(h), { collection: 'website_home', id: 'es', field: 'hero_title', value: 'Synthetic response' });
  }
});

test('global singleton uses Directus singleton route without nonexistent item ID', async () => {
  const h = harness({}, async () => ({ ok: true, status: 200, json: async () => ({ data: { brand_name: 'Synthetic' } }) }));
  await runContentCli(['get', 'globals', 'global', 'brand_name'], h.options);
  assert.equal(new URL(h.calls[0][0]).pathname, '/items/website_globals');
  const write = harness({ DIRECTUS_CONTENT_TOKEN: token });
  await runContentCli(['set', 'globals', 'global', 'brand_name', 'Synthetic', '--apply'], write.options);
  assert.equal(new URL(write.calls[0][0]).pathname, '/items/website_globals');
  assert.deepEqual(JSON.parse(write.calls[0][1].body), { brand_name: 'Synthetic' });
});

test('CMS base permits HTTPS or localhost HTTP only, never credentials/query/hash', async () => {
  for (const base of ['http://remote.invalid', 'https://user:pass@localhost', 'https://cms.invalid/?secret=x', 'https://cms.invalid/#x', 'file:///tmp/cms', 'http://localhost.evil.invalid', 'ftp://localhost']) {
    const h = harness({ CONTENT_CMS_URL: base });
    await assert.rejects(runContentCli(['get', 'home', 'es', 'hero_title'], h.options));
    assert.equal(h.calls.length, 0);
  }
  for (const base of ['http://localhost:8055', 'http://127.0.0.1:8055', 'http://[::1]:8055', 'https://cms.invalid/directus/']) {
    const h = harness({ CONTENT_CMS_URL: base });
    await runContentCli(['get', 'home', 'es', 'hero_title'], h.options);
    assert.ok(String(h.calls[0][0]).startsWith(base.replace(/\/$/, '') + '/items/'));
  }
});

test('HTTP/network errors are sanitized and failed writes are never retried', async () => {
  for (const responder of [async () => ({ ok: false, status: 403, text: async () => token }), async () => { throw Error(token); }]) {
    const h = harness({ DIRECTUS_CONTENT_TOKEN: token }, responder);
    await assert.rejects(runContentCli(['set', 'home', 'es', 'hero_title', 'Synthetic', '--apply'], h.options), error => {
      assert.ok(!error.message.includes(token));
      assert.match(error.message, /CMS.*(?:403|red)/);
      return true;
    });
    assert.equal(h.calls.length, 1);
    assert.equal(h.lines.length, 0);
  }
});

test('read rejects missing/invalid response and masks server parser messages', async () => {
  for (const json of [async () => ({ data: {} }), async () => { throw Error(token); }]) {
    const h = harness({}, async () => ({ ok: true, status: 200, json }));
    await assert.rejects(runContentCli(['get', 'home', 'es', 'hero_title'], h.options), error => !error.message.includes(token));
    assert.equal(h.lines.length, 0);
  }
});

test('requests use an actual ten-second abort signal', async () => {
  const original = AbortSignal.timeout;
  const durations = [];
  AbortSignal.timeout = milliseconds => { durations.push(milliseconds); return original(milliseconds); };
  try {
    const h = harness();
    await runContentCli(['get', 'home', 'es', 'hero_title'], h.options);
    assert.deepEqual(durations, [10000]);
  } finally { AbortSignal.timeout = original; }
});
