/** Shared locale/routing contract. Country must already be validated as trusted by the caller. */
export const locales = Object.freeze(['es', 'en']);

const spanishCountries = new Set([
  'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GT', 'HN',
  'MX', 'NI', 'PA', 'PY', 'PE', 'PR', 'UY', 'VE', 'ES', 'GQ',
]);
// Deliberately explicit: an unknown/non-LATAM country is NOT evidence for English.
const englishCountries = new Set(['US', 'GB', 'CA', 'AU', 'NZ', 'IE']);
const validLocale = (value) => locales.includes(value);
const safeLocale = (value) => validLocale(value) ? value : 'es';

/** Cookie > trusted country > weighted browser language > Spanish. Pure; no header/env access. */
export function chooseLocale({ cookie, country, acceptLanguage } = {}) {
  if (validLocale(cookie)) return cookie;

  const countryCode = typeof country === 'string' ? country.trim().toUpperCase() : '';
  if (spanishCountries.has(countryCode)) return 'es';
  if (englishCountries.has(countryCode)) return 'en';

  if (typeof acceptLanguage !== 'string') return 'es';
  const preferences = [];
  for (const entry of acceptLanguage.split(',')) {
    const [range, ...parameters] = entry.trim().split(';').map((part) => part.trim());
    // Match complete language tags, not arbitrary strings starting with "en"/"es".
    if (!/^(?:es|en)(?:-[a-z0-9]{1,8})*$/i.test(range)) continue;
    let weight = 1;
    if (parameters.length) {
      // HTTP qvalues allow at most three decimal places and must lie in [0, 1].
      if (parameters.length !== 1 || !/^q\s*=\s*(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/i.test(parameters[0])) continue;
      weight = Number(parameters[0].split('=')[1].trim());
    }
    if (weight > 0) preferences.push({ locale: range.slice(0, 2).toLowerCase(), weight });
  }
  // JS sort is stable: equal weights preserve the sender's preference order.
  preferences.sort((a, b) => b.weight - a.weight);
  return preferences[0]?.locale ?? 'es';
}

function pathSegments(path) {
  if (typeof path !== 'string') return [];
  // Refuse absolute URLs, protocol-relative paths, backslashes and header/control injection.
  if (/[\\\u0000-\u001f\u007f]/.test(path)) return [];
  const pathname = path.trim().split(/[?#]/, 1)[0];
  if (/^[a-z][a-z\d+.-]*:/i.test(pathname) || pathname.startsWith('//')) return [];
  const segments = [];
  try {
    for (const part of pathname.split('/')) {
      const decoded = decodeURIComponent(part);
      if (/[\/\\\u0000-\u001f\u007f]/.test(decoded)) return [];
      if (!decoded || decoded === '.') continue;
      if (decoded === '..') segments.pop();
      else segments.push(decoded);
    }
  } catch {
    return []; // Malformed percent encoding must never break the language selector.
  }
  if (validLocale(segments[0])) segments.shift();
  return segments;
}

/** Same-origin pathname only, one locale prefix and trailing slash; query/hash are discarded. */
export function localePath(locale, path = '') {
  const prefix = `/${safeLocale(locale)}/`;
  try {
    const segments = pathSegments(path).map((segment) => encodeURIComponent(segment));
    return `${prefix}${segments.length ? `${segments.join('/')}/` : ''}`;
  } catch {
    return prefix; // Lone Unicode surrogates cannot be represented in a URI.
  }
}

/** Invalid locale input behaves as the default Spanish locale. */
export function otherLocale(locale) {
  return safeLocale(locale) === 'es' ? 'en' : 'es';
}

/** Switch locale without losing route/slug, including legacy unprefixed /project/... routes. */
export function localizedEquivalent(pathname, locale) {
  return localePath(locale, pathname);
}
