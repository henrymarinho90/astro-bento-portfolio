import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import {
  CONSENT_DEFAULT, clientIdFromCookie, consentSignals, cookieDomains, cookiesToDelete, gtmBootstrap, parseConsent, serializeConsent,
} from '../src/lib/consent.mjs';

const read = (p) => readFile(new URL(`../src/${p}`, import.meta.url), 'utf8');

/** Run the inline <head> bootstrap in a sandbox with a fake localStorage and DOM. */
function runBootstrap(stored, id = 'GTM-WQ4LMT9T') {
  const inserted = [];
  const script = { parentNode: { insertBefore: (node) => inserted.push(node) } };
  const window = {
    localStorage: { getItem: () => stored },
    document: { getElementsByTagName: () => [script], createElement: () => ({}) },
  };
  window.window = window;
  vm.createContext(window);
  vm.runInContext(gtmBootstrap(id), window);
  // Arguments objects (gtag commands) become arrays; JSON round-trip moves values into this realm.
  const layer = JSON.parse(JSON.stringify(window.dataLayer.map(entry => (Object.prototype.toString.call(entry) === '[object Arguments]' ? Array.from(entry) : entry))));
  return { layer, inserted, window };
}

test('bootstrap: consent default (all denied) before the official GTM snippet, no gtag.js', () => {
  const src = gtmBootstrap('GTM-WQ4LMT9T');
  const iDefault = src.indexOf("gtag('consent','default'");
  const iGtm = src.indexOf('googletagmanager.com/gtm.js');
  assert.ok(iDefault >= 0 && iGtm > iDefault, 'consent default must precede gtm.js');
  assert.ok(src.indexOf("gtag('consent','update'") < iGtm, 'stored choice applied before gtm.js');
  assert.ok(src.indexOf("'ads_data_redaction',true") < iGtm);
  assert.ok(src.indexOf("'url_passthrough',false") < iGtm);
  assert.doesNotMatch(src, /gtag\/js/);
  assert.match(src, /'script','dataLayer',"GTM-WQ4LMT9T"\)/);
  for (const bad of ['', 'G-BQD50XSC22', 'GTM-abc', 'GTM-X"</script>', null]) assert.equal(gtmBootstrap(bad), '', String(bad));

  const { layer, inserted } = runBootstrap(null);
  assert.deepEqual(layer[0], ['consent', 'default', { ...CONSENT_DEFAULT }]);
  assert.deepEqual(CONSENT_DEFAULT, {
    analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    functionality_storage: 'granted', security_storage: 'granted', wait_for_update: 500,
  });
  assert.deepEqual(layer[1], ['set', 'ads_data_redaction', true]);
  assert.deepEqual(layer[2], ['set', 'url_passthrough', false]);
  assert.ok(!layer.some(e => Array.isArray(e) && e[1] === 'update'), 'no update without a stored choice');
  assert.equal(layer.at(-1).event, 'gtm.js');
  assert.equal(inserted[0].src, 'https://www.googletagmanager.com/gtm.js?id=GTM-WQ4LMT9T');
});

test('bootstrap applies a stored v2 / legacy choice as consent update before gtm.js', () => {
  const cases = [
    [JSON.stringify({ v: 2, analytics: true, ads: false, ts: 1 }), { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }],
    [JSON.stringify({ v: 2, analytics: true, ads: true, ts: 1 }), { analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' }],
    ['granted', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }],
    ['denied', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }],
  ];
  for (const [stored, expected] of cases) {
    const { layer, window } = runBootstrap(stored);
    const iUpdate = layer.findIndex(e => Array.isArray(e) && e[1] === 'update');
    assert.deepEqual(layer[iUpdate], ['consent', 'update', expected], stored);
    assert.ok(iUpdate < layer.findIndex(e => e.event === 'gtm.js'), stored);
    assert.equal(typeof window.__romaConsent.analytics, 'boolean');
  }
  // Corrupt storage or blocked storage: defaults only, never throws.
  for (const stored of ['{"v":1,"analytics":true}', '{bad', 'yes']) assert.ok(!runBootstrap(stored).layer.some(e => Array.isArray(e) && e[1] === 'update'));
});

test('consent storage: JSON v2 and migration of the one-category values', () => {
  assert.deepEqual(parseConsent('granted'), { analytics: true, ads: false, legacy: true });
  assert.deepEqual(parseConsent('denied'), { analytics: false, ads: false, legacy: true });
  assert.deepEqual(parseConsent('{"v":2,"analytics":false,"ads":true,"ts":5}'), { analytics: false, ads: true, legacy: false });
  for (const bad of [null, '', 'GRANTED', '{"v":2,"analytics":"yes","ads":false}', '{"v":3,"analytics":true,"ads":true}', '[]']) assert.equal(parseConsent(bad), null, String(bad));
  const saved = JSON.parse(serializeConsent({ analytics: true, ads: false }, 42));
  assert.deepEqual(saved, { v: 2, analytics: true, ads: false, ts: 42 });
  assert.deepEqual(consentSignals({ analytics: false, ads: true }), { analytics_storage: 'denied', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
});

test('ga_client_id comes from the _ga cookie only; denied categories lose their cookies', () => {
  assert.equal(clientIdFromCookie('a=1; _ga=GA1.1.123456789.1700000000; _ga_ABC=GS1.1.x'), '123456789.1700000000');
  assert.equal(clientIdFromCookie('_ga=GA1.2.987.654'), '987.654');
  for (const bad of ['', '_gat=1', '_ga=<script>', '_ga=GA1.1.abc.def', '_ga=1.2']) assert.equal(clientIdFromCookie(bad), '', bad);
  const jar = '_ga=GA1.1.1.2; _ga_XYZ=1; _gid=1; _gat_UA=1; _gcl_au=1; _gcl_aw=1; roma_locale=es';
  assert.deepEqual(cookiesToDelete(jar, { analytics: false, ads: true }), ['_ga', '_ga_XYZ', '_gid', '_gat_UA']);
  assert.deepEqual(cookiesToDelete(jar, { analytics: true, ads: false }), ['_gcl_au', '_gcl_aw']);
  assert.deepEqual(cookiesToDelete(jar, { analytics: true, ads: true }), []);
  assert.deepEqual(cookieDomains('portfolio.romahomestore.com'), ['', 'portfolio.romahomestore.com', '.portfolio.romahomestore.com', '.romahomestore.com']);
});

test('Analytics.astro: GTM via bootstrap, dataLayer events with the same names, no gtag events, no PII', async () => {
  const src = await read('components/roma/Analytics.astro');
  assert.match(src, /gtmBootstrap\(gtmId\)/);
  assert.match(src, /import\.meta\.env\.PROD && !noindex/);
  assert.match(src, /<script is:inline set:html=\{bootstrap\} \/>/);
  assert.doesNotMatch(src, /gtag\/js|createElement\('script'\)/, 'no direct gtag.js');
  assert.doesNotMatch(src, /gtag\('event'/, 'events go through the dataLayer');
  assert.doesNotMatch(src, /gtag\('config'/);
  for (const name of ["'cta_click'", "'contact'", "'lang_switch'", "'lead_form_start'", "'lead_form_submit'", "'generate_lead'", "'consent_update'"]) assert.ok(src.includes(name), name);
  assert.doesNotMatch(src, /'form_start'|'form_submit_attempt'/);
  assert.match(src, /gtag\('consent', 'update', consentSignals\(next\)\)/);
  assert.match(src, /sessionStorage\.removeItem\(PENDING_KEY\)/, 'generate_lead stays one-shot');
  assert.match(src, /current\.analytics \? clientIdFromCookie\(document\.cookie\) : ''/);
  // dataLayer keys are a closed list: never name, email, phone or message.
  const keys = [...src.matchAll(/push\(\{([^}]*)\}/g)].flatMap(m => [...m[1].matchAll(/(\w+):/g)].map(k => k[1]));
  for (const key of keys) assert.ok(['event', 'area', 'location', 'method', 'language_from', 'language_to', 'locale', 'analytics', 'ads'].includes(key), `dataLayer key ${key}`);
  assert.doesNotMatch(src, /\.get\('(name|message|contact_email|contact_whatsapp)'\)/);
  assert.doesNotMatch(src, /\b(contact_email|contact_whatsapp|email|phone)\b\s*:/);
  const noscript = await read('components/roma/GtmNoscript.astro');
  assert.match(noscript, /<noscript><iframe src=\{`https:\/\/www\.googletagmanager\.com\/ns\.html\?id=\$\{id\}`\}/);
  assert.match(noscript, /import\.meta\.env\.PROD && !noindex && GTM_ID_PATTERN\.test\(gtmId\)/);
});

test('ConsentBanner: two accessible toggles, three actions, JSON v2 with legacy migration, reopen', async () => {
  const banner = await read('components/roma/ConsentBanner.astro');
  assert.match(banner, /addEventListener\('roma:consent-open'/);
  assert.match(banner, /emit\(choice\)/);
  assert.match(banner, /type="checkbox" role="switch"/);
  assert.match(banner, /<label for=\{`consent-\$\{key\}`\}>/);
  assert.match(banner, /aria-describedby=\{`consent-\$\{key\}-desc`\}/);
  for (const action of ['reject', 'save', 'accept']) assert.match(banner, new RegExp(`data-consent-action="${action}"`));
  for (const key of ['consent_banner_title', 'consent_banner_text', 'consent_analytics_label', 'consent_analytics_description', 'consent_ads_label', 'consent_ads_description', 'consent_save_label', 'consent_accept_all_label', 'consent_reject_all_label']) assert.ok(banner.includes(`home.${key}`), key);
  assert.match(banner, /parsed\?\.legacy && stored\) save\(stored\)/);
  assert.match(banner, /serializeConsent\(choice\)/);
  assert.doesNotMatch(banner, /checked(=|\s*\/>)/, 'no pre-ticked category');
  const layout = await read('layouts/RomaLayout.astro');
  assert.match(layout, /preferencesLabel&&<button[^>]*data-consent-open/);
  const head = layout.slice(layout.indexOf('<head>'), layout.indexOf('</head>'));
  assert.ok(head.indexOf('<Analytics') < head.indexOf('<title>'), 'GTM as high as possible in <head>');
});

test('GTM container export: valid JSON, unique ids, advanced consent (built-in checks), Ads paused', async () => {
  const exported = JSON.parse(await readFile(new URL('../docs/gtm/roma-gtm-container.json', import.meta.url), 'utf8'));
  assert.equal(exported.exportFormatVersion, 2);
  const v = exported.containerVersion;
  assert.equal(v.container.publicId, 'GTM-WQ4LMT9T');
  for (const kind of ['tag', 'trigger', 'variable']) {
    const ids = v[kind].map(item => item[`${kind}Id`]);
    assert.equal(new Set(ids).size, ids.length, `${kind} ids unique`);
    const names = v[kind].map(item => item.name);
    assert.equal(new Set(names).size, names.length, `${kind} names unique`);
  }
  const triggerIds = new Set(v.trigger.map(t => t.triggerId));
  const variableNames = new Set([...v.variable.map(x => x.name), ...v.builtInVariable.map(x => x.name)]);
  const param = (tag, key) => tag.parameter.find(p => p.key === key);
  for (const tag of v.tag) {
    for (const id of tag.firingTriggerId ?? []) assert.ok(triggerIds.has(id) || ['2147479553', '2147479573'].includes(id), `${tag.name} trigger ${id}`);
    for (const ref of JSON.stringify(tag.parameter).matchAll(/\{\{([^}]+)\}\}/g)) assert.ok(variableNames.has(ref[1]), `${tag.name} → {{${ref[1]}}}`);
  }
  const google = v.tag.find(t => t.type === 'googtag');
  assert.equal(param(google, 'tagId').value, 'G-BQD50XSC22');
  const events = v.tag.filter(t => t.type === 'gaawe').map(t => param(t, 'eventName').value).sort();
  assert.deepEqual(events, ['contact', 'cta_click', 'generate_lead', 'lang_switch', 'lead_form_start', 'lead_form_submit']);
  // Advanced mode: Google tags keep their built-in consent checks (GA4 → analytics_storage, Ads → ad_storage +
  // ad_user_data) and ping without cookies while denied. "Additional consent required" would block them (= basic).
  for (const tag of v.tag) assert.equal(tag.consentSettings.consentStatus, 'NOT_NEEDED', tag.name);
  for (const tag of v.tag.filter(t => t.type === 'gaawe')) {
    assert.equal(param(tag, 'measurementIdOverride').value, 'G-BQD50XSC22');
    const keys = param(tag, 'eventSettingsTable').list.map(row => row.map[0].value);
    assert.ok(keys.includes('locale'), tag.name);
    for (const key of keys) assert.ok(['area', 'location', 'method', 'locale', 'language_from', 'language_to'].includes(key), `${tag.name}: ${key}`);
  }
  const ads = v.tag.filter(t => t.type === 'awct');
  assert.equal(ads.length, 2);
  for (const tag of ads) {
    assert.equal(tag.paused, true, tag.name);
    assert.equal(param(tag, 'conversionId').value, '{{AW - Conversion ID}}');
  }
  assert.equal(v.variable.find(x => x.name === 'AW - Conversion ID').parameter[0].value, 'AW-XXXXXXXXXX');
  assert.ok(v.tag.some(t => t.type === 'gclidw'), 'Conversion Linker');
  assert.doesNotMatch(JSON.stringify(exported), /contact_email|contact_whatsapp|"name":\s*"DLV - name"/);
});
