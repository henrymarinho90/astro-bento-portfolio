/**
 * Blog articles live in Directus `projects`. The original fields (title, description, content) hold the
 * source text; the optional Spanish version lives in title_es/description_es/content_es on the same row
 * and slug. /es/ uses it only when es_status === 'published' and title_es and content_es are non-empty;
 * a missing description_es falls back to the original description.
 * Otherwise /es/ keeps showing the original with the "original language" note.
 */
const filled = (value) => typeof value === 'string' && value.trim() !== '';

/** Spanish fields the build requests from Directus in addition to the original ones. */
export const projectSpanishFields = Object.freeze(['es_status', 'title_es', 'description_es', 'content_es']);

export function hasPublishedSpanish(project) {
  return project?.es_status === 'published' && filled(project.title_es) && filled(project.content_es);
}

/**
 * Returns the article as shown on `locale`, plus `translated` (Spanish version in use) and
 * `contentLang` (language of the body, for the `lang` attribute). Never mutates the input and never
 * exposes the *_es fields to the components.
 */
export function localizeProject(project, locale) {
  const { es_status: _status, title_es, description_es, content_es, ...original } = project ?? {};
  if (locale === 'es' && hasPublishedSpanish(project)) {
    return {
      ...original,
      title: title_es.trim(),
      description: filled(description_es) ? description_es.trim() : original.description,
      content: content_es,
      translated: true,
      contentLang: 'es',
    };
  }
  return { ...original, translated: false, contentLang: 'en' };
}
