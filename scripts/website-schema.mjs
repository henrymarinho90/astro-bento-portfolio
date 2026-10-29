import { websiteCollections } from '../src/lib/website-model.mjs';

const translations = label => [
  { language: 'en-US', translation: label },
  { language: 'es-ES', translation: label },
];
const icons = { globals: 'public', common: 'translate', home: 'home', practices: 'work', people: 'groups' };
const hasBaselineField = (definition, key) => definition.records.some(row => Object.hasOwn(row, key));

function inputOptions(descriptor) {
  return descriptor.choices ? { choices: structuredClone(descriptor.choices) } : { ...(descriptor.maxLength ? { maxLength: descriptor.maxLength } : {}) };
}

function scalarMeta(descriptor, multiline = true) {
  const note = descriptor.format === 'image'
    ? 'URL pública de imagen, sin HTML. Suba el archivo a Files y pegue su URL pública; también puede conservar la ruta del recurso existente.'
    : descriptor.format === 'link'
      ? 'URL del enlace como texto, sin HTML. Use una ruta o un protocolo permitido; no cambia las rutas del sitio.'
      : 'Texto plano, sin HTML. El diseño permanece protegido.';
  return {
    interface: descriptor.choices ? 'select-dropdown' : multiline && !descriptor.format && /description|bio|disclaimer|note/.test(descriptor.key) ? 'input-multiline' : 'input',
    options: inputOptions(descriptor),
    required: Boolean(descriptor.required),
    translations: translations(descriptor.label),
    note,
  };
}

function editorialField(descriptor, group) {
  if (descriptor.type !== 'list') return {
    field: descriptor.key,
    type: 'text',
    schema: { is_nullable: !descriptor.required },
    meta: { ...scalarMeta(descriptor), group },
  };
  const templateKey = ['label', 'name', 'company'].find(key => descriptor.itemFields.some(child => child.key === key)) ?? descriptor.itemFields[0]?.key;
  return {
    field: descriptor.key,
    type: 'json',
    schema: { is_nullable: !descriptor.required },
    meta: {
      interface: 'list',
      special: ['cast-json'],
      required: Boolean(descriptor.required),
      group,
      translations: translations(descriptor.label),
      note: 'Añada o edite elementos mediante sus campos. Sin HTML ni editor de código JSON; el diseño permanece protegido.',
      options: {
        limit: descriptor.maxItems,
        template: `{{${templateKey}}}`,
        fields: descriptor.itemFields.map(child => ({
          field: child.key,
          name: child.label,
          type: 'string',
          meta: scalarMeta(child, false),
        })),
      },
    },
  };
}

/** Pure Directus collection-create payload. It never writes to the CMS. */
export function createCollectionSchema(definition) {
  const fields = [
    {
      field: 'id', type: 'string',
      schema: { is_primary_key: true, is_nullable: false, max_length: 64 },
      meta: { interface: 'input', readonly: true, hidden: true, translations: translations('Identificador estable'), note: 'ID del registro aprobado; no generar ni modificar.' },
    },
    {
      field: 'record_label', type: 'text', schema: { is_nullable: false },
      meta: { interface: 'input', required: true, translations: translations('Nombre editorial del registro'), note: 'Nombre para identificar el registro en el administrador; no se muestra en la web.' },
    },
    {
      field: 'status', type: 'string', schema: { default_value: 'draft', is_nullable: false },
      meta: {
        interface: 'select-dropdown', required: true, translations: translations('Estado de publicación'),
        options: { choices: [{ text: 'Borrador', value: 'draft' }, { text: 'Publicado', value: 'published' }] },
        note: 'Solo los registros publicados podrán leerse públicamente. La web estática requiere una nueva compilación.',
      },
    },
  ];
  for (const [key, label] of [['locale', 'Idioma'], ['key', 'Clave estable']]) {
    if (hasBaselineField(definition, key)) fields.push({
      field: key, type: 'string', schema: { is_nullable: false, max_length: 64 },
      meta: { interface: 'input', readonly: true, translations: translations(label), note: 'Metadato del registro aprobado; no modificar.' },
    });
  }
  const groups = new Map();
  for (const descriptor of definition.fields) {
    if (!groups.has(descriptor.group)) {
      const alias = `editorial_group_${groups.size + 1}`;
      groups.set(descriptor.group, alias);
      fields.push({
        field: alias, type: 'alias', schema: null,
        meta: { interface: 'group-detail', special: ['alias', 'no-data', 'group'], options: { start: 'open' }, translations: translations(descriptor.group) },
      });
    }
    fields.push(editorialField(descriptor, groups.get(descriptor.group)));
  }
  fields.forEach((field, sort) => { field.meta.sort = sort + 1; });
  return {
    collection: definition.collection,
    meta: {
      singleton: definition.singleton,
      icon: icons[definition.alias] ?? 'article',
      translations: translations(definition.label),
      display_template: '{{record_label}}',
      note: 'Contenido editorial: diseño protegido. Código, estructura, tipografías, CSS y rutas válidas no se editan aquí. Publicación estática tras compilación y despliegue aprobados.',
      sort: Math.max(0, websiteCollections.findIndex(item => item.alias === definition.alias)) + 1,
    },
    schema: {},
    fields,
  };
}

export const websiteSchemas = websiteCollections.map(createCollectionSchema);

/** Caller supplies the reviewed public policy ID; no other action is granted. */
export function publicReadPermission(definition, policyId) {
  if (typeof policyId !== 'string' || !policyId.trim()) throw new TypeError('Se requiere el ID de la política pública');
  return {
    collection: definition.collection,
    policy: policyId,
    action: 'read',
    permissions: { status: { _eq: 'published' } },
    fields: ['id', 'status', ...(hasBaselineField(definition, 'locale') ? ['locale'] : []), ...definition.fields.map(field => field.key)],
  };
}
