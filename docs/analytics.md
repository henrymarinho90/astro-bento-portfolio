# Analítica: Google Tag Manager + Consent Mode v2 (avanzado)

Un único contenedor de **Google Tag Manager** (`GTM-WQ4LMT9T`) gestiona GA4 (`G-BQD50XSC22`), Google Ads (cuenta aún por crear) y cualquier etiqueta futura. El sitio no carga `gtag.js` directamente: solo GTM.

- ID en `website_globals.gtm_id` (validación `^GTM-[A-Z0-9]+$`, por defecto `GTM-WQ4LMT9T`; vacío desactiva toda la medición).
- `website_globals.ga4_id` se conserva **solo como referencia** (el ID de GA4 vive dentro del contenedor GTM); el sitio ya no lo lee. No se borra.
- Componentes: `src/components/roma/Analytics.astro` (en `<head>`, lo primero tras `charset`/`viewport`), `src/components/roma/GtmNoscript.astro` (justo después de `<body>`), `src/components/roma/ConsentBanner.astro`. Lógica compartida y testeada: `src/lib/consent.mjs`.
- Se renderiza solo en producción (`astro build`), fuera de previews `PUBLIC_NOINDEX=true` y con un `gtm_id` válido.
- Configuración de GTM/GA4/Ads/Search Console/Business Profile paso a paso: **`docs/gtm-setup.md`**. Contenedor importable: `docs/gtm/roma-gtm-container.json`.

## Consentimiento (Consent Mode v2, modo avanzado)

Orden en `<head>` (script inline, antes de cualquier otra cosa de Google):

1. `gtag('consent','default', {analytics_storage, ad_storage, ad_user_data, ad_personalization: 'denied', functionality_storage, security_storage: 'granted', wait_for_update: 500})`.
2. `gtag('set','ads_data_redaction',true)` y `gtag('set','url_passthrough',false)`.
3. Si hay una elección guardada en `localStorage.roma_consent`, se aplica ya como `gtag('consent','update', …)`.
4. Snippet oficial de GTM (`googletagmanager.com/gtm.js`).

**Modo avanzado:** GTM carga **siempre**. Mientras una categoría esté denegada, las etiquetas de Google no escriben ni leen cookies de esa categoría y solo envían *pings* sin cookies (sin `client_id` persistente) que Google usa para modelado agregado. Esto está explicado en la sección 9 de la política de privacidad. Las etiquetas de Google del contenedor usan sus **comprobaciones de consentimiento integradas** (GA4 → `analytics_storage`; Ads y Conversion Linker → `ad_storage` + `ad_user_data`) con "No se requiere consentimiento adicional": marcar "Requerir consentimiento adicional" las bloquearía por completo (= modo básico, sin pings ni modelado). Las etiquetas que **no** son de Google (píxeles de terceros) sí deben configurarse con "Requerir consentimiento adicional".

### Banner (2 categorías)

| Categoría | Señales de Google | Cookies que se borran al denegar |
|---|---|---|
| Analítica | `analytics_storage` | `_ga`, `_ga_*`, `_gid`, `_gat*` |
| Publicidad | `ad_storage`, `ad_user_data`, `ad_personalization` | `_gcl_*`, `_gac*` |

- Interruptores accesibles (`<input type="checkbox" role="switch">` con `<label>` y descripción por `aria-describedby`), ninguno marcado por defecto. Botones **Rechazar todo**, **Guardar selección**, **Aceptar todo**.
- `localStorage.roma_consent` = `{"v":2,"analytics":bool,"ads":bool,"ts":<epoch ms>}`. Valores antiguos del banner de una categoría se migran al cargar: `granted` → `{analytics:true, ads:false}` (la publicidad siempre estuvo denegada), `denied` → todo denegado. Cualquier otro valor = sin elección (se vuelve a preguntar).
- Al elegir (o al cargar con una elección guardada), el banner emite `window` `roma:consent` con `detail = {analytics, ads}`. `Analytics.astro` envía `gtag('consent','update', …)` + `dataLayer.push({event:'consent_update', analytics, ads})` solo si la elección cambió (idempotente; la elección guardada ya se aplicó en `<head>`), y borra las cookies de cada categoría denegada (en el dominio actual y sus padres).
- Revocar: el enlace del pie (`home.consent_preferences_label`, `data-consent-open`) emite `roma:consent-open`; el banner reaparece con los interruptores en el estado guardado.
- Textos (en `website_home`, ES/EN): `consent_banner_title`, `consent_banner_text`, `consent_analytics_label`, `consent_analytics_description`, `consent_ads_label`, `consent_ads_description`, `consent_save_label`, `consent_accept_all_label`, `consent_reject_all_label`, `consent_privacy_link_label`, `consent_preferences_label`. Los carga `scripts/load-copy.mjs` (`consentCopy`).

## Eventos (dataLayer)

Todos son `dataLayer.push({event, area, location, method, language_from, language_to, locale})`: cada push incluye **todas** las claves (las que no aplican van `undefined`) para que GTM no arrastre valores de un evento anterior. `locale` es `es`/`en` según la página.

| Evento | Cuándo | Parámetros |
|---|---|---|
| `page_view` | automático (etiqueta Google tag en GTM) | (estándar) |
| `cta_click` | clic en CTA (`data-track="cta_click"`) | `area` (legal/data/none), `location` (hero, services, ...) |
| `contact` | clic en WhatsApp o correo | `method` (`whatsapp`/`email`), `area`, `location` |
| `lang_switch` | cambio ES/EN | `language_from`, `language_to` |
| `lead_form_start` | primer input del formulario | `area`, `location` |
| `lead_form_submit` | envío del formulario (antes de validar en servidor) | `area`, `location` |
| `generate_lead` | carga de `/{es,en}/gracias/` tras enviar el formulario | `area`, `method: form` |
| `consent_update` | cambio de consentimiento | `analytics`, `ads` (booleanos) |

`generate_lead` se envía una sola vez por formulario enviado: el envío deja una marca en `sessionStorage` (caduca en 10 min) que la página de gracias consume. Recargar o entrar directo a `/gracias/` no cuenta. **Ningún parámetro contiene nombre, correo, teléfono ni mensaje**; la URL de gracias solo lleva `?area=`. Los nombres `lead_form_*` evitan chocar con `form_start`/`form_submit` de Medición mejorada.

## Vinculación del lead

Al enviar el formulario, si `analytics_storage` está concedido, el campo oculto `ga_client_id` se rellena con el client_id de GA4 leído de la cookie `_ga` (`GA1.1.<aleatorio>.<timestamp>` → `<aleatorio>.<timestamp>`). Se guarda en `leads.ga_client_id` (Directus) y aparece en la nota de Twenty. Sin consentimiento de analítica queda vacío (y se vacía si se revoca).

## Comprobaciones

- `npm test` (`tests/analytics.test.mjs`): ejecuta el bootstrap de `<head>` en un sandbox (consent default antes de `gtm.js`, elección guardada aplicada antes, sin `gtag.js`), migración del valor antiguo y JSON v2, lectura de `_ga`, borrado de cookies por categoría, eventos sin PII, banner accesible y validez del contenedor GTM exportado (ids únicos, referencias a variables, Ads en pausa). `tests/website-schema.test.mjs`: `gtm_id` (validación, default, lectura pública).
- `npm run test:dist` (tras `npm run build`): el HTML de `/es/`, `/en/` y un artículo contiene el consent default antes de `gtm.js`, `GTM-WQ4LMT9T`, el `<noscript>` justo tras `<body>` y ningún `gtag.js`; en un build `PUBLIC_NOINDEX=true` no hay nada de Google.
- En vivo: GTM → **Vista previa** (Tag Assistant), ver `docs/gtm-setup.md`.
