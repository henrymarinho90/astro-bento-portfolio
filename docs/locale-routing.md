# Selección de idioma y rutas bilingües

## Contrato

`src/pages/index.astro` atiende **únicamente `/`** mediante SSR (`prerender = false`). No consulta el CMS ni genera contenido, fotos o embeds: devuelve `Astro.redirect(..., 302)` hacia `/es/` o `/en/`.

Orden de selección:

1. Cookie `roma_locale`, solo si su valor es exactamente `es` o `en`.
2. País enviado por un proxy de confianza, **solo con `TRUST_PROXY_COUNTRY=true`** (cadena exacta, en minúsculas).
3. `Accept-Language`, usando pesos `q`, variantes regionales y orden original para desempates. Se ignoran idiomas no soportados, rangos con `q=0` y pesos inválidos. `*` no constituye una preferencia concreta.
4. Español cuando ninguna señal permite elegir.

Los países hispanohablantes contemplados son AR, BO, CL, CO, CR, CU, DO, EC, SV, GT, HN, MX, NI, PA, PY, PE, PR, UY, VE, ES y GQ. Los países con selección inglesa explícita son US, GB, CA, AU, NZ e IE. Es una política de idioma inicial, no una afirmación de que toda persona de esos países hable ese idioma. **Otros países (p. ej. BR, FR, DE, JP) utilizan `Accept-Language`; no se consideran ingleses por estar fuera de LATAM.** La cookie siempre tiene prioridad.

Las rutas explícitas `/es/`, `/en/` y sus subrutas **nunca se redirigen por detección de idioma**: la lógica existe solo en `src/pages/index.astro`, no en middleware ni en layouts. No debe reutilizarse como guardia de las páginas localizadas. El selector navega directamente al equivalente localizado, sin pasar por `/`.

## Geolocalización y frontera de confianza

`Accept-Language` refleja preferencias del navegador, **no la ubicación real**. Este código no obtiene coordenadas, no consulta servicios de geolocalización y no interpreta IP proporcionada por el cliente.

La geolocalización por IP genuina requiere infraestructura edge/proxy que determine el país. El adaptador raíz solo lee `cf-ipcountry` cuando `TRUST_PROXY_COUNTRY` vale exactamente `true`. No acepta `x-country`, `x-vercel-ip-country` ni otros encabezados arbitrarios. Por defecto ignora incluso `cf-ipcountry`.

Antes de habilitar la variable:

- Comprobar que el tráfico llega por el proxy autorizado y bloquear acceso directo al origen.
- Hacer que ese proxy elimine o sobrescriba cualquier `CF-IPCountry` que envíe el visitante.
- Configurar la variable en el entorno servidor/build correspondiente a Astro y verificar el artefacto desplegado. Dependiendo del adaptador, `import.meta.env` se resuelve durante el build: no asumir que cambiar una variable de un proceso ya construido modifica la decisión.
- Verificar mediante peticiones reales que la señal proviene del proveedor y que códigos ausentes/desconocidos recurren al idioma del navegador.

Activar una variable no autentica por sí solo un encabezado. Si no se puede garantizar esa frontera, dejar la opción deshabilitada. Una VPN, una IP compartida o las limitaciones de la base de geolocalización también pueden dar un país diferente al real.

## Cookies y caché

La respuesta raíz incluye siempre:

```http
HTTP/1.1 302 Found
Location: /es/
Vary: Cookie, Accept-Language, CF-IPCountry
Cache-Control: private, no-store
```

`Location` también puede ser `/en/`. No se aceptan destinos externos, parámetros `next` ni valores de cookie como URL. Mantener `/` fuera de reglas CDN de caché forzada; `Vary` no sustituye `private, no-store`. La detección automática no escribe cookies.

El componente de selección manual (fuera de estos archivos) debe validar `es`/`en`, guardar la preferencia **solo tras una elección explícita** y navegar al enlace generado por `localizedEquivalent`:

```js
import { locales, localizedEquivalent } from '../lib/i18n.mjs';

if (locales.includes(locale)) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `roma_locale=${locale}; Path=/; SameSite=Lax; Max-Age=31536000${secure}`;
  location.assign(localizedEquivalent(location.pathname, locale));
}
```

La duración es un año (365 días). Se omite `Domain` para una cookie host-only. `Secure` se añade en HTTPS; `HttpOnly` no aplica si escribe el selector del navegador. Si las cookies están deshabilitadas, los enlaces explícitos siguen funcionando. No almacenar ubicación ni IP en esta cookie.

## Utilidades compartidas

`src/lib/i18n.mjs` exporta:

- `locales`: `['es', 'en']`, array congelado.
- `chooseLocale({ cookie, country, acceptLanguage } = {})`: función pura; `country` **ya debe haber sido considerado confiable por el llamador**. No lee encabezados ni variables de entorno por sí misma.
- `localePath(locale, path = '')`: devuelve un pathname interno con prefijo y slash final. Por ejemplo, `localePath('en', '/project/demo')` → `/en/project/demo/`.
- `otherLocale(locale)`: alterna español/inglés.
- `localizedEquivalent(pathname, locale)`: cambia el primer prefijo `/es/` o `/en/`, o añade el prefijo a rutas heredadas como `/project/demo/`, preservando el resto de la ruta y el slug.

Las utilidades normalizan separadores repetidos internos y segmentos `.`/`..`, codifican los segmentos, descartan query/hash y usan español ante un locale inválido. Rechazan URLs absolutas, rutas protocol-relative, barras inversas, controles, barras codificadas y escapes porcentuales inválidos: devuelven la raíz del locale en esos casos. No traducen slugs ni crean páginas inexistentes. La UI debe proporcionar equivalentes que existan y conservar query/hash por separado solo si esa funcionalidad se define expresamente.

## Verificación local

```sh
node --test tests/i18n.test.mjs
```

La suite cubre precedencia, países, negociación ponderada, normalización y destinos seguros. Ejecuta el frontmatter real de la raíz con objetos web `Request`/`Response` y un contexto Astro mínimo: verifica estado, cabeceras, cookies y opt-in del proxy sin dependencias ni acceso al CMS. No reemplaza una prueba HTTP con el adaptador SSR de producción ni una verificación de la autenticidad del proxy.

Para integración, comprobar además que `/es/` y `/en/` siguen mostrando su idioma con cookie y país contrarios; el selector y las páginas localizadas son responsabilidad de sus respectivos componentes/rutas. Los tests de publicación que consultaban la antigua homepage deben apuntar a la página localizada que ahora consulta proyectos, sin perder las comprobaciones de contenido publicado.
