/**
 * Consent Mode v2 (advanced) helpers shared by the <head> bootstrap, the banner and the analytics module.
 *
 * Stored choice: localStorage 'roma_consent' = JSON {v:2, analytics:boolean, ads:boolean, ts:number}.
 * Legacy values from the one-category banner are migrated: 'granted' → analytics only (ads were always
 * denied), 'denied' → nothing. Anything else is "no choice yet" (the banner asks again).
 *
 * Categories → Google consent types:
 *  - analytics → analytics_storage
 *  - ads       → ad_storage, ad_user_data, ad_personalization
 * functionality_storage and security_storage are always granted (strictly necessary, no Google cookies).
 */

export const CONSENT_KEY = 'roma_consent';
export const CONSENT_VERSION = 2;
export const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

/**
 * Parse a raw localStorage value. Self-contained (no outer references, ES5 syntax): it is also
 * serialised with Function#toString into the inline <head> bootstrap.
 * @returns {{analytics: boolean, ads: boolean, legacy: boolean} | null}
 */
export function parseConsent(raw) {
  if (raw === 'granted') return { analytics: true, ads: false, legacy: true };
  if (raw === 'denied') return { analytics: false, ads: false, legacy: true };
  if (typeof raw !== 'string' || raw.charAt(0) !== '{') return null;
  try {
    var value = JSON.parse(raw);
    if (!value || value.v !== 2 || typeof value.analytics !== 'boolean' || typeof value.ads !== 'boolean') return null;
    return { analytics: value.analytics, ads: value.ads, legacy: false };
  } catch (e) {
    return null;
  }
}

/** Google consent signals for a choice (also self-contained: serialised into the bootstrap). */
export function consentSignals(choice) {
  var a = choice && choice.analytics ? 'granted' : 'denied';
  var d = choice && choice.ads ? 'granted' : 'denied';
  return { analytics_storage: a, ad_storage: d, ad_user_data: d, ad_personalization: d };
}

export function serializeConsent(choice, now = Date.now()) {
  return JSON.stringify({ v: CONSENT_VERSION, analytics: Boolean(choice.analytics), ads: Boolean(choice.ads), ts: now });
}

/** Default state declared before GTM loads: everything that sets or reads identifiers is denied. */
export const CONSENT_DEFAULT = Object.freeze({
  analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  functionality_storage: 'granted', security_storage: 'granted', wait_for_update: 500,
});

/**
 * Inline <head> script: consent default (+ stored choice as an update) BEFORE the official GTM snippet.
 * The ID is validated here; an invalid ID returns '' and nothing is rendered.
 */
export function gtmBootstrap(gtmId) {
  if (typeof gtmId !== 'string' || !GTM_ID_PATTERN.test(gtmId)) return '';
  return [
    'window.dataLayer=window.dataLayer||[];',
    'function gtag(){dataLayer.push(arguments);}',
    `gtag('consent','default',${JSON.stringify(CONSENT_DEFAULT)});`,
    "gtag('set','ads_data_redaction',true);",
    "gtag('set','url_passthrough',false);",
    '(function(){',
    `var parseConsent=${parseConsent.toString()};`,
    `var consentSignals=${consentSignals.toString()};`,
    `var choice=null;try{choice=parseConsent(localStorage.getItem(${JSON.stringify(CONSENT_KEY)}));}catch(e){}`,
    "window.__romaConsent=choice?{analytics:choice.analytics,ads:choice.ads}:null;",
    "if(choice){gtag('consent','update',consentSignals(choice));}",
    '})();',
    // Official Google Tag Manager snippet (unchanged except for the validated ID).
    "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':",
    "new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],",
    "j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=",
    "'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);",
    `})(window,document,'script','dataLayer',${JSON.stringify(gtmId)});`,
  ].join('\n');
}

/** Read the GA client id from the _ga cookie (GA1.1.<random>.<timestamp> → "<random>.<timestamp>"). */
export function clientIdFromCookie(cookieString) {
  const match = /(?:^|;\s*)_ga=([^;]*)/.exec(typeof cookieString === 'string' ? cookieString : '');
  if (!match) return '';
  const parts = decodeURIComponent(match[1]).split('.');
  if (parts.length < 4 || !/^GA\d+$/.test(parts[0])) return '';
  const id = parts.slice(-2).join('.');
  return /^\d{1,20}\.\d{1,20}$/.test(id) ? id : '';
}

/** Cookie names a category owns (used to delete them when the category is denied). */
export function cookiesToDelete(cookieString, { analytics, ads }) {
  const names = String(cookieString ?? '').split(';').map(c => c.split('=')[0].trim()).filter(Boolean);
  return names.filter(name => (!analytics && (name === '_ga' || name.startsWith('_ga_') || name === '_gid' || name.startsWith('_gat')))
    || (!ads && (name.startsWith('_gcl_') || name === '_gac' || name.startsWith('_gac_'))));
}

/** Domains to try when deleting (host and every parent except the TLD), e.g. ['', a.b.com, .a.b.com, .b.com]. */
export function cookieDomains(hostname) {
  const parts = String(hostname ?? '').split('.');
  const domains = ['', hostname];
  for (let i = 0; i < parts.length - 1; i++) domains.push(`.${parts.slice(i).join('.')}`);
  return [...new Set(domains)];
}
