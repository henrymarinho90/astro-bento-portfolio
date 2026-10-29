import defaults from '../content/website-defaults.json' with { type: 'json' };

export const websiteDefaults = defaults;

// Only descriptions live here: all editorial values come from the approved JSON.
const editorialGroups = {
  globals: {
    'Identidad de marca': {
      brand_name: 'Nombre de marca', full_name: 'Nombre completo', brand_eyebrow: 'Identificador de marca',
      header_logo: 'Logotipo de cabecera', footer_logo: 'Logotipo de pie', symbol_image: 'Símbolo de marca',
      logo_alt: 'Texto alternativo del logotipo', home_link_label: 'Etiqueta del enlace a inicio', symbol_label: 'Etiqueta del símbolo',
    },
    'Buscadores y difusión': { social_image: 'Imagen para redes sociales', seo_suffix: 'Sufijo del título SEO', rss_title: 'Título del canal RSS' },
    'Contacto': { data_contact_url: 'Enlace de contacto de datos e IA', legal_contact_url: 'Enlace de contacto jurídico' },
  },
  common: {
    'Navegación y accesibilidad': {
      navigation: 'Enlaces de navegación', skip_label: 'Salto al contenido', navigation_label: 'Nombre accesible de navegación',
      language_label: 'Selector de idioma', menu_open_label: 'Abrir menú', menu_close_label: 'Cerrar menú', back_home_label: 'Volver al inicio',
    },
    'Pie de página': {
      footer_tagline: 'Lema del pie', footer_scope_label: 'Encabezado del ámbito de trabajo', footer_data_scope: 'Ámbito de datos e IA',
      footer_legal_scope: 'Ámbito jurídico', footer_blog_label: 'Enlace al blog en el pie', footer_contact_label: 'Contacto en el pie',
      footer_disclaimer: 'Aviso del pie', footer_rss_label: 'Etiqueta del canal RSS',
    },
    'Archivo y proyectos': {
      blog_title: 'Título del blog', projects_title: 'Título de proyectos', blog_description: 'Descripción del blog', projects_description: 'Descripción de proyectos',
      archive_eyebrow: 'Antetítulo del archivo', archive_projects_link: 'Enlace a la vista de proyectos', archive_blog_link: 'Enlace a la vista de artículos',
      archive_entry_label: 'Tipo de entrada del archivo', archive_read_label: 'Enlace de lectura', archive_empty: 'Mensaje de archivo vacío', archive_note: 'Nota sobre el idioma original',
    },
    'Artículos': {
      article_description_default: 'Descripción predeterminada del artículo', article_back_label: 'Volver al archivo', article_eyebrow: 'Antetítulo del artículo',
      article_by_label: 'Prefijo de autoría', article_empty_note: 'Aviso de texto ampliado ausente', article_resources_label: 'Encabezado de recursos',
      article_resource_label: 'Enlace de recurso', article_demo_label: 'Enlace al proyecto en línea', article_projects_label: 'Enlace a otros proyectos',
      article_contact_label: 'Invitación de contacto del artículo', article_original_note: 'Nota de idioma del artículo',
    },
    'Páginas de servicios': { practice_process_note: 'Nota sobre el proceso de trabajo', practice_contact_label: 'Invitación de contacto del servicio' },
  },
  home: {
    'Buscadores': { seo_title: 'Título SEO de inicio', seo_description: 'Descripción SEO de inicio' },
    'Índice de página': { rail_label: 'Nombre del índice', rail_services: 'Enlace a servicios', rail_team: 'Enlace al equipo', rail_contact: 'Enlace a contacto' },
    'Presentación principal': {
      hero_title: 'Título principal', hero_accent: 'Texto destacado principal', hero_description: 'Descripción principal', hero_primary_label: 'Acción principal',
      hero_secondary_label: 'Acción secundaria', hero_territory: 'Ámbito de la presentación',
    },
    'Firma de marca': { signature_title: 'Título de la firma', signature_accent: 'Texto destacado de la firma', signature_label: 'Etiqueta de la firma' },
    'Servicios': { services_label: 'Antetítulo de servicios', services_title: 'Título de servicios' },
    'Equipo': { team_label: 'Antetítulo del equipo', team_title: 'Título del equipo', team_description: 'Descripción del equipo' },
    'Publicaciones': {
      publications_label: 'Antetítulo de publicaciones', publications_title: 'Título de publicaciones', archive_label: 'Enlace al archivo completo',
      entry_label: 'Tipo de publicación', entry_link_label: 'Enlace al contenido original', original_note: 'Nota sobre los idiomas originales',
    },
    'Contacto': {
      contact_label: 'Antetítulo de contacto', contact_title: 'Título de contacto', contact_description: 'Descripción de contacto',
      data_contact_label: 'Acción de consulta de datos e IA', legal_contact_label: 'Acción de consulta jurídica', contact_note: 'Nota de coordinación de contacto',
    },
  },
  practices: {
    'Tarjeta de servicio': {
      card_label: 'Antetítulo de tarjeta', card_title: 'Título de tarjeta', card_description: 'Descripción de tarjeta',
      card_items: 'Servicios de la tarjeta', card_link_label: 'Enlace de la tarjeta',
    },
    'Página de servicio': {
      territory: 'Ámbito de prestación', page_title: 'Título de la página', page_description: 'Descripción de la página', disclaimer: 'Aviso del servicio',
      page_items: 'Servicios de la página', projects_link_label: 'Enlace a proyectos del servicio', page_territory: 'Territorio de la página',
    },
  },
  people: {
    'Perfil profesional': { label: 'Área profesional', role: 'Cargo y especialidad', bio: 'Biografía', name: 'Nombre de la persona' },
    'Enlaces profesionales': { linkedin_label: 'Etiqueta de LinkedIn', linkedin_url: 'Enlace de LinkedIn' },
    'Experiencia y herramientas': { experience_label: 'Encabezado de trayectoria', jobs: 'Trayectoria laboral', tools: 'Herramientas profesionales' },
  },
};

const targets = [
  { text: 'Inicio', value: 'home' }, { text: 'Servicios', value: 'services' }, { text: 'Nosotros', value: 'about' },
  { text: 'Blog', value: 'blog' }, { text: 'Contacto', value: 'contact' },
];
const imageKeys = new Set(['header_logo', 'footer_logo', 'symbol_image', 'social_image']);
function scalar(key, label, group) {
  const format = imageKeys.has(key) ? 'image' : key.endsWith('_url') || key === 'url' ? 'link' : undefined;
  const required = format !== 'link' && !key.endsWith('_note') && !key.endsWith('disclaimer') && !['projects_link_label', 'experience_label'].includes(key);
  return { key, type: 'string', label, group, required, ...(format ? { format } : {}), maxLength: format ? 2048 : 20000 };
}
function field(key, label, group) {
  const lists = {
    navigation: { maxItems: 10, items: [['target', 'Destino'], ['label', 'Texto del enlace'], ['url', 'URL alternativa']] },
    jobs: { maxItems: 30, items: [['company', 'Empresa'], ['role', 'Cargo'], ['year', 'Año']] },
    tools: { maxItems: 50, items: [['name', 'Nombre de herramienta']] },
    card_items: { maxItems: 30, items: [['label', 'Nombre del servicio']] },
    page_items: { maxItems: 30, items: [['label', 'Nombre del servicio']] },
  };
  if (!Object.hasOwn(lists, key)) return scalar(key, label, group);
  const list = lists[key];
  return {
    key, type: 'list', label, group, required: false, maxItems: list.maxItems,
    itemFields: list.items.map(([itemKey, itemLabel]) => ({
      ...scalar(itemKey, itemLabel, group), ...(itemKey === 'target' ? { choices: targets } : {}),
    })),
  };
}

export const websiteCollections = Object.entries({ globals: 'Identidad y enlaces', common: 'Textos comunes', home: 'Inicio', practices: 'Servicios', people: 'Personas' }).map(([alias, label]) => ({
  alias, collection: `website_${alias}`, label, singleton: alias === 'globals', records: structuredClone(defaults[`website_${alias}`]),
  fields: Object.entries(editorialGroups[alias]).flatMap(([group, labels]) => Object.entries(labels).map(([key, fieldLabel]) => field(key, fieldLabel, group))),
}));

function isRecord(value) {
  return value !== null && typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function safeUrl(value, image = false) {
  if (typeof value !== 'string' || value.length > 2048 || /[\s\\\p{Cc}\p{Cf}]/u.test(value)) return false;
  // Encoded line breaks/backslashes are unsafe even inside otherwise allowed schemes.
  if (/%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) {
    try {
      const decoded = decodeURIComponent(value);
      return !/^\/[/\\]/.test(decoded) && !/[\\\p{Cc}\p{Cf}]/u.test(decoded);
    } catch { return false; }
  }
  if (/^https:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
    } catch { return false; }
  }
  return !image && (/^#[^#]+$/.test(value) || /^(?:mailto|tel):[^/].+$/i.test(value));
}

function validField(field, value) {
  if (field.type === 'list') {
    return Array.isArray(value) && value.length <= field.maxItems && Array.from(value).every(item =>
      isRecord(item) && Object.keys(item).every(key => field.itemFields.some(child => child.key === key)) &&
      field.itemFields.every(child => Object.hasOwn(item, child.key) ? validField(child, item[child.key]) : !child.required));
  }
  return typeof value === 'string' && value.length <= field.maxLength && (!field.required || value.trim().length > 0) &&
    (!field.choices || field.choices.some(choice => choice.value === value)) &&
    (!field.format || (!field.required && value === '') || safeUrl(value, field.format === 'image'));
}

const workflowFields = [
  { ...scalar('status', 'Estado de publicación', 'Flujo editorial'), choices: [{ text: 'Borrador', value: 'draft' }, { text: 'Publicado', value: 'published' }] },
  scalar('record_label', 'Nombre editorial del registro', 'Flujo editorial'),
];

export function validateContentPatch(alias, recordId, patch) {
  const definition = websiteCollections.find(item => item.alias === alias);
  if (!definition || !definition.records.some(item => item.id === recordId)) throw new TypeError('Colección o registro desconocido');
  if (!isRecord(patch)) throw new TypeError('El cambio debe ser un objeto');
  for (const key of Object.keys(patch)) {
    const field = [...definition.fields, ...workflowFields].find(field => field.key === key);
    if (!field) throw new TypeError(`Campo no editable: ${key}`);
    if (!validField(field, patch[key])) throw new TypeError(`Valor inválido: ${key}`);
  }
  return structuredClone(patch);
}

function assertLocale(locale) {
  if (locale !== 'es' && locale !== 'en') throw new RangeError('Idioma desconocido');
}

export function navigationHref(item, locale) {
  assertLocale(locale);
  if (safeUrl(item?.url)) return item.url;
  const routes = { home: '', services: '#servicios', about: '#nosotros', blog: 'blog/', contact: '#contacto' };
  const target = item?.target;
  return `/${locale}/${typeof target === 'string' && Object.hasOwn(routes, target) ? routes[target] : ''}`;
}

export function resolveWebsiteContent(records, locale) {
  assertLocale(locale);
  const record = (collection, id) => {
    const baseline = defaults[collection].find(item => item.id === id);
    const result = structuredClone(baseline);
    const override = records?.[collection]?.find(item => item.id === id && item.status === 'published' && (!Object.hasOwn(item, 'locale') || item.locale === baseline.locale));
    if (override) {
      const definition = websiteCollections.find(item => item.collection === collection);
      for (const field of [...definition.fields, ...workflowFields]) {
        if (Object.hasOwn(override, field.key) && validField(field, override[field.key])) result[field.key] = structuredClone(override[field.key]);
      }
    }
    return result;
  };
  return {
    globals: record('website_globals', 'global'),
    common: record('website_common', locale),
    home: record('website_home', locale),
    practices: Object.fromEntries(['legal', 'data'].map(key => [key, record('website_practices', `${locale}-${key}`)])),
    people: Object.fromEntries(['tatiana', 'henry'].map(key => [key, record('website_people', `${locale}-${key}`)])),
  };
}
