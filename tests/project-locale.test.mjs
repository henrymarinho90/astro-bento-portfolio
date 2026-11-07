import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { hasPublishedSpanish, localizeProject, projectSpanishFields } from '../src/lib/project-locale.mjs';

const base = {
  slug: 'case-study', title: 'Case Study', description: 'Analysis', content: '<p>Results</p>',
  image: 'img', date_created: '2026-01-01T12:00:00Z', repo_link: null, url: null,
};
const spanish = { es_status: 'published', title_es: ' Caso de estudio ', description_es: 'Análisis', content_es: '<p>Resultados</p>' };

test('/es/ uses the published Spanish version, same slug and media, without leaking *_es fields', () => {
  const result = localizeProject({ ...base, ...spanish }, 'es');
  assert.deepEqual(result, { ...base, title: 'Caso de estudio', description: 'Análisis', content: '<p>Resultados</p>', translated: true, contentLang: 'es' });
  for (const key of projectSpanishFields) assert.ok(!(key in result), key);
});

test('/en/ always shows the original, even when a Spanish version is published', () => {
  assert.deepEqual(localizeProject({ ...base, ...spanish }, 'en'), { ...base, translated: false, contentLang: 'en' });
});

test('draft, missing or incomplete Spanish versions fall back to the original on /es/', () => {
  for (const variant of [
    {}, { ...spanish, es_status: 'draft' }, { ...spanish, es_status: null },
    { ...spanish, title_es: '  ' }, { ...spanish, content_es: null },
  ]) {
    const project = { ...base, ...variant };
    assert.equal(hasPublishedSpanish(project), false, JSON.stringify(variant));
    assert.deepEqual(localizeProject(project, 'es'), { ...base, translated: false, contentLang: 'en' });
  }
});

test('an empty Spanish description keeps the original description', () => {
  const result = localizeProject({ ...base, ...spanish, description_es: '' }, 'es');
  assert.equal(result.description, 'Analysis');
  assert.equal(result.title, 'Caso de estudio');
});

test('the CMS client requests exactly the Spanish fields the helper reads', async () => {
  const source = await readFile(new URL('../src/lib/directus.ts', import.meta.url), 'utf8');
  for (const key of projectSpanishFields) assert.match(source, new RegExp(`'${key}'`), key);
});
