# Guía: Google Tag Manager, GA4, Google Ads, Search Console y Google Business Profile

Pasos manuales (en las consolas de Google) para dejar operativa la medición del sitio `https://portfolio.romahomestore.com`. El código del sitio ya está listo: carga el contenedor `GTM-WQ4LMT9T` con Consent Mode v2 **avanzado** y envía los eventos al `dataLayer` (ver `docs/analytics.md`).

Los nombres de menú están en español (interfaz de Google en español). Si tu interfaz está en inglés, el equivalente aparece entre paréntesis.

> Orden recomendado: 1 → 2 → 3 → 4 → 5 → 6. Google Ads (5) puede esperar; las etiquetas de Ads ya vienen **en pausa**.

---

## 1. Google Tag Manager: importar el contenedor

Archivo: `docs/gtm/roma-gtm-container.json` (en el repositorio). Contiene:

| Tipo | Nombre | Qué hace |
|---|---|---|
| Etiqueta Google (googtag) | `Google tag - GA4 G-BQD50XSC22` | Carga GA4 y envía `page_view`. Google Signals y personalización de anuncios desactivados. Activador: *Initialization - All Pages*. |
| Conversion Linker | `Conversion Linker` | Guarda el `gclid` de los anuncios (solo con `ad_storage` concedido). |
| Evento de GA4 (gaawe) ×6 | `GA4 - generate_lead`, `GA4 - contact`, `GA4 - cta_click`, `GA4 - lead_form_start`, `GA4 - lead_form_submit`, `GA4 - lang_switch` | Un evento de GA4 por evento del `dataLayer`, con parámetros `area`, `location`, `method`, `locale` (y `language_from`/`language_to` en `lang_switch`). |
| Seguimiento de conversiones de Google Ads (awct) ×2 | `Google Ads - Conversión generate_lead`, `Google Ads - Conversión contact` | **En pausa** hasta crear la cuenta de Ads (paso 5). |
| Activadores | `CE - <evento>` ×6 | Evento personalizado con el nombre exacto del evento. |
| Variables | `DLV - area`, `DLV - location`, `DLV - method`, `DLV - locale`, `DLV - language_from`, `DLV - language_to` | Variables de la capa de datos (versión 2). |
| Variables constantes | `AW - Conversion ID` (`AW-XXXXXXXXXX`), `AW - Label generate_lead`, `AW - Label contact` | Marcadores de posición para Ads. |

### 1.1 Antes de importar

1. Entra en <https://tagmanager.google.com> y abre el contenedor **GTM-WQ4LMT9T**.
2. En **Etiquetas** (Tags), revisa si ya existe alguna etiqueta de Google con `G-BQD50XSC22`. Si existe, **elimínala** después de importar (o no importes la nuestra): dos etiquetas de Google con el mismo ID duplican los `page_view`.

### 1.2 Importar

1. **Administrar** (Admin) → columna *Contenedor* → **Importar contenedor** (Import Container).
2. **Elegir un archivo de contenedor** → selecciona `roma-gtm-container.json`.
3. **Elige un espacio de trabajo**: **Existente** → *Default Workspace* (o **Nuevo** si prefieres aislar el cambio).
4. **Elige una opción de importación**: **Combinar** (Merge) → **Cambiar el nombre de las etiquetas, los activadores y las variables en conflicto** (Rename conflicting tags, triggers and variables).
5. Revisa el resumen (deben aparecer 10 etiquetas, 6 activadores y 9 variables nuevas) → **Confirmar**.
6. **Variables** → **Configurar** (Configure) en *Variables integradas*: comprueba que **Event**, **Page URL**, **Page Path**, **Page Hostname** y **Referrer** están marcadas (el archivo ya las activa).

### 1.3 Comprobar el consentimiento en GTM

1. **Administrar** → **Configuración del contenedor** (Container Settings) → *Configuración adicional* → marca **Habilitar la vista general del consentimiento** (Enable consent overview) → **Guardar**.
2. En **Etiquetas**, pulsa el icono del escudo (**Vista general del consentimiento**). Todas las etiquetas de Google deben figurar con *Comprobaciones de consentimiento integradas* (GA4: `analytics_storage`; Ads y Conversion Linker: `ad_storage`, `ad_user_data`) y **No se requiere consentimiento adicional**.
   - **No** cambies las etiquetas de Google a "Requerir consentimiento adicional": eso las bloquearía sin consentimiento y anularía el modo avanzado (sin pings sin cookies ni modelado).
   - Cualquier etiqueta **que no sea de Google** que añadas en el futuro (Meta, LinkedIn, Hotjar…) **sí** debe tener **Requerir consentimiento adicional para que se active la etiqueta** con `ad_storage` (publicidad) o `analytics_storage` (analítica), y la política de privacidad (sección 5) debe nombrar a ese proveedor antes de publicarla.

### 1.4 Vista previa con Tag Assistant

1. Botón **Vista previa** (Preview), arriba a la derecha → URL `https://portfolio.romahomestore.com/es/` → **Connect**. Se abre el sitio en otra pestaña con el distintivo de Tag Assistant.
2. En Tag Assistant, sin tocar el banner:
   - Pestaña **Consentimiento** (Consent) del evento *Consent Initialization*: `On-page Default` = **Denied** para `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`.
   - La etiqueta *Google tag* aparece como **activada** (modo avanzado: envía pings sin cookies). En el navegador no debe haber cookies `_ga` ni `_gcl_*` (DevTools → Application → Cookies).
3. En el banner del sitio, activa solo **Analítica** → **Guardar selección**:
   - Aparece el evento `consent_update`; en **Consentimiento**, `On-page Update`: `analytics_storage` = **Granted**, `ad_storage`/`ad_user_data`/`ad_personalization` = **Denied**.
   - Aparece la cookie `_ga`.
4. Haz clic en un botón de WhatsApp: evento `contact` → etiqueta `GA4 - contact` activada; en **Variables**, `DLV - method` = `whatsapp`.
5. Envía el formulario de prueba (con datos ficticios) → `lead_form_submit`, y en `/es/gracias/` → `generate_lead` (una sola vez; al recargar no se repite).
6. Pie de página → **Preferencias de cookies** → **Rechazar todo**: `consent_update` con todo **Denied** y desaparecen las cookies `_ga*`.
7. En GA4 → **Administrar** → **DebugView** verás los eventos de la sesión de vista previa.

### 1.5 Publicar

1. **Enviar** (Submit) → **Publicar y crear versión** (Publish and Create Version).
2. Nombre de la versión: `v1 - GA4 + Ads (pausa) + Consent Mode avanzado`. Descripción: qué cambió.
3. **Publicar** (Publish). Para deshacer: **Versiones** → versión anterior → **Publicar**.

---

## 2. Google Analytics 4 (propiedad con `G-BQD50XSC22`)

Todo en <https://analytics.google.com> → **Administrar** (Admin, rueda abajo a la izquierda).

1. **Eventos clave** (Key events): *Visualización de datos* → **Eventos** → en `generate_lead` y `contact`, activa la estrella **Marcar como evento clave**. Si aún no aparecen (tardan hasta 24 h tras el primer evento): *Visualización de datos* → **Eventos clave** → **Nuevo evento clave** → escribe `generate_lead` → **Guardar**; repite con `contact`.
2. **Dimensiones personalizadas**: *Visualización de datos* → **Definiciones personalizadas** → **Crear dimensión personalizada**, con **Ámbito: Evento**:
   | Nombre de la dimensión | Parámetro de evento |
   |---|---|
   | Área | `area` |
   | Ubicación | `location` |
   | Método | `method` |
   | Idioma de la página | `locale` (opcional) |
3. **Retención**: *Recogida y modificación de datos* → **Retención de datos** → *Retención de datos de eventos* = **14 meses** → **Guardar**.
4. **Google Signals**: *Recogida y modificación de datos* → **Recogida de datos** → deja **desactivada** la *Recogida de datos de Google Signals*. Motivo: Signals asocia la navegación a cuentas de Google con personalización de anuncios; la política del sitio no lo contempla y el contenedor ya envía `allow_google_signals=false`. Si algún día se activa, hay que actualizar la sección 9 de la política primero.
5. **Flujo web**: *Recogida y modificación de datos* → **Flujos de datos** → el flujo del sitio:
   - Comprueba que el **ID de medición** es `G-BQD50XSC22`.
   - **Medición mejorada**: puede seguir activa. Recomendado: en el engranaje, desactiva **Interacciones con formularios** (nuestros `lead_form_start`/`lead_form_submit` ya lo cubren sin ruido).
   - Si en el flujo hay una etiqueta instalada "directamente" de antes (gtag.js), ya no hace falta: el sitio solo carga GTM.
6. **Estado del consentimiento**: en el mismo flujo, sección **Configuración del consentimiento** (Consent settings), tras unos días debe indicar que llegan señales de consentimiento para *medición* y *personalización de anuncios*.
7. **Comprobación**: **Informes** → **Tiempo real** (y **DebugView** durante la vista previa de GTM).

---

## 3. Vincular Search Console con GA4

Requisitos: ser **propietario verificado** de la propiedad de Search Console (ya verificada) y **Editor** o superior en GA4.

1. GA4 → **Administrar** → *Vinculaciones de productos* → **Enlaces de Search Console** → **Vincular**.
2. **Elegir cuentas** → marca la propiedad `portfolio.romahomestore.com` (o `sc-domain:romahomestore.com` si es de dominio) → **Confirmar** → **Siguiente**.
3. **Seleccionar flujo web** → el flujo del sitio → **Siguiente** → **Enviar**.
4. Para ver los informes: **Informes** → **Biblioteca** (abajo) → colección **Search Console** → menú ⋮ → **Publicar**. Aparecen en *Informes → Search Console → Consultas* y *Tráfico de búsqueda orgánica de Google*.

## 4. Enviar el sitemap en Search Console

1. <https://search.google.com/search-console> → elige la propiedad del sitio.
2. *Indexación* → **Sitemaps** → **Añadir un sitemap nuevo** → URL completa `https://portfolio.romahomestore.com/sitemap-index.xml` (si la propiedad es de prefijo de URL, basta con escribir `sitemap-index.xml`) → **Enviar**.
3. Estado esperado: **Correcto**, con las URLs `/es/…` y `/en/…` descubiertas. Si sale "No se ha podido obtener", vuelve a intentarlo en unas horas; el sitemap ya está referenciado en `robots.txt`.

---

## 5. Google Ads (cuenta por crear)

### 5.1 Crear la cuenta sin campaña

1. <https://ads.google.com> → **Empezar ahora** con la cuenta de Google que administrará los anuncios.
2. Cuando proponga crear una campaña, pulsa **¿Eres un anunciante experto? Cambiar al modo experto** (Switch to Expert Mode).
3. En la página de objetivos, elige **Crear una cuenta sin campaña** (Create an account without a campaign).
4. **Confirma los datos de la empresa**: país de facturación **Colombia**, zona horaria **(GMT-05:00) Hora de Colombia**, moneda **Peso colombiano (COP)**. La zona horaria y la moneda **no se pueden cambiar** después → **Enviar**.
5. Facturación se configura cuando vayas a lanzar una campaña (**Herramientas → Facturación**).
6. **Etiquetado automático**: *Administrador* (Admin) → **Configuración de la cuenta** → **Etiquetado automático** → marcado (necesario para `gclid`).

### 5.2 Vincular GA4 ↔ Google Ads

1. GA4 → **Administrar** → *Vinculaciones de productos* → **Enlaces de Google Ads** → **Vincular** → **Elegir cuentas de Google Ads** → marca la cuenta nueva → **Confirmar** → **Siguiente**.
2. *Configurar opciones*: **Habilitar la publicidad personalizada**: déjalo **desactivado** mientras no hagas remarketing (si lo activas, primero actualiza la política). **Habilitar el etiquetado automático**: activado → **Siguiente** → **Enviar**.

### 5.3 Conversiones: elige UNA vía como principal

**Vía A — Importar eventos clave de GA4 (más simple, recomendada para empezar)**

1. Google Ads → **Objetivos** → **Conversiones** → **Resumen** → **+ Crear acción de conversión** → **Importar** → **Propiedades de Google Analytics 4** → **Web** → **Continuar**.
2. Marca `generate_lead` y `contact` → **Importar y continuar** → **Listo**.
3. En cada acción, **Optimización de la acción**: `generate_lead` = **Acción principal**; `contact` = principal o secundaria según quieras optimizar las campañas también por clics a WhatsApp.
4. Las etiquetas `Google Ads - Conversión …` de GTM se quedan **en pausa**.

**Vía B — Etiqueta de conversión de Google Ads en GTM (más precisa y rápida; usa los tags en pausa)**

1. Google Ads → **Objetivos** → **Conversiones** → **+ Crear acción de conversión** → **Sitio web** → introduce `portfolio.romahomestore.com` → **Analizar** → **Añadir manualmente una acción de conversión**:
   - `Lead formulario`: categoría **Enviar formulario de clientes potenciales**, valor (opcional), recuento **Una**.
   - `Contacto WhatsApp/correo`: categoría **Contacto**, recuento **Una**.
2. **Guardar y continuar** → en *Configuración de la etiqueta* elige **Usar Google Tag Manager**. Copia el **ID de conversión** (número, p. ej. `1234567890`) y la **Etiqueta de conversión** de cada acción.
3. GTM → **Variables**:
   - `AW - Conversion ID` → valor = el ID de conversión (solo los dígitos, sin `AW-`, que es lo que espera la etiqueta de conversión de Ads de GTM).
   - `AW - Label generate_lead` y `AW - Label contact` → las etiquetas de conversión respectivas.
4. GTM → **Etiquetas** → marca `Google Ads - Conversión generate_lead` y `Google Ads - Conversión contact` → menú **⋮** (o botón de acciones) → **Reanudar** (Unpause). No toques su consentimiento (integrado: `ad_storage`, `ad_user_data`).
5. **Vista previa** (aceptando *Publicidad* en el banner) → las etiquetas se activan en `generate_lead`/`contact` → **Enviar** → **Publicar**.
6. Si también importaste los eventos de GA4 (Vía A), márcalos como **Acción secundaria** para no contar dos veces.

> Antes de lanzar la primera campaña, la sección 5 de la política ya menciona Google Ads; no hace falta cambiar textos. Si añades remarketing o listas de clientes, sí.

---

## 6. Google Business Profile (práctica jurídica)

Para que la práctica de Tatiana Rodríguez aparezca en Google Maps y en la búsqueda local.

1. <https://business.google.com> → **Gestionar ahora** (con la cuenta de Google de la práctica) → **Añadir tu empresa**.
2. **Nombre de la empresa**: el nombre real con el que la práctica se presenta (p. ej. `Tatiana Rodríguez Abogada` o `ROMA — Rodríguez Mariño Consulting`). Sin palabras clave añadidas ("abogado herencias Bucaramanga") porque Google suspende perfiles por eso.
3. **Categoría principal**: **Abogado**. Después, en **Editar perfil → Categorías de la empresa**, añade secundarias que existan en la lista y correspondan a servicios reales (busca "derecho de familia", "inmobiliario", "sucesiones"/"testamentos").
4. **¿Quieres añadir una ubicación que los clientes puedan visitar?** → **No** (empresa de área de servicio). Google pedirá la dirección (`Cra 23 # 31-96, Bucaramanga`) **solo para verificar**; no se mostrará en el perfil.
5. **Zonas de servicio**: Bucaramanga, Floridablanca, Girón, Piedecuesta, Santander, y otras ciudades donde realmente se atienda (máx. 20).
6. **Datos de contacto**: teléfono `+57 316 084 5842`; **Sitio web**:
   `https://portfolio.romahomestore.com/es/servicios/legal/?utm_source=google&utm_medium=organic&utm_campaign=gbp`
   (las UTM separan en GA4 las visitas que llegan desde el perfil: fuente `google`, medio `organic`, campaña `gbp`).
7. **WhatsApp**: **Editar perfil** → **Contacto** → **WhatsApp** (si la opción aparece en tu región) → número `+57 316 084 5842`. Si no aparece, no hay alternativa en el perfil (la descripción no admite enlaces): quedan el botón **Llamar** y el sitio web, que ya ofrece WhatsApp.
8. **Verificación**: elige el método que ofrezca Google (normalmente **grabar un vídeo** mostrando el lugar de trabajo, documentos de la práctica con nombre/NIT o tarjeta profesional, y herramientas de trabajo; a veces teléfono o correo). Tarda de días a un par de semanas.
9. Tras verificar: **Editar perfil** → *Descripción* (máx. 750 caracteres, sin URLs ni promociones), *Horario*, *Servicios* (Sucesiones, Procesos de inmuebles y tierras, Derecho de familia…), foto de perfil y logo. **Reseñas**: pide reseñas a clientes reales; no ofrezcas nada a cambio (y en el área jurídica, nunca reveles datos del caso al responder).

---

## 7. Resumen de verificación final

- [ ] GTM publicado; Tag Assistant muestra default *Denied* antes de `gtm.js` y *update* al aceptar.
- [ ] Sin elección: no hay cookies `_ga`/`_gcl_*`; tras aceptar analítica aparece `_ga`; tras rechazar, desaparece.
- [ ] GA4 Tiempo real recibe `page_view`, `cta_click`, `contact`, `generate_lead` con `area`/`location`/`method`.
- [ ] `generate_lead` y `contact` marcados como eventos clave; dimensiones creadas; retención 14 meses; Signals desactivado.
- [ ] Search Console vinculado y sitemap `sitemap-index.xml` en estado *Correcto*.
- [ ] Google Ads: cuenta creada en modo experto, vinculada a GA4, conversiones por Vía A **o** Vía B (etiquetas reanudadas solo en B).
- [ ] Business Profile verificado con la URL con UTM.
