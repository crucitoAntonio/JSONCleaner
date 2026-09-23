import { parse as parseYaml } from 'yaml';

export type JsonSchemaMap = Record<string, unknown>;

export type Source =
  { kind: 'openapi'; version: string; schemas: JsonSchemaMap } | { kind: 'data'; json: string };

// URI base ficticia: quicktype solo unifica un tipo de nivel superior con el mismo tipo
// alcanzado por $ref cuando ambas direcciones son absolutas e idénticas. Con refs relativas
// ("#/definitions/X") genera duplicados como `Guild` + `GuildClass`.
export const SCHEMA_BASE_URI = 'spec.json#/definitions/';

const REF_PREFIXES = ['#/components/schemas/', '#/definitions/'];

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Lee el texto como YAML (que también acepta JSON). Si es un spec Swagger 2 / OpenAPI 3,
 * devuelve sus esquemas (`definitions` o `components.schemas`); si no, lo trata como datos
 * de ejemplo a partir de los cuales inferir clases.
 */
export function readSource(text: string): Source {
  const doc: unknown = parseYaml(text);
  if (doc === null || doc === undefined || typeof doc !== 'object') {
    throw new Error('Pega un objeto o arreglo JSON/YAML, no un valor suelto.');
  }
  if (isRecord(doc) && (typeof doc.openapi === 'string' || typeof doc.swagger === 'string')) {
    const version = String(doc.openapi ?? doc.swagger);
    const components = isRecord(doc.components) ? doc.components : {};
    const schemas = isRecord(components.schemas)
      ? components.schemas
      : isRecord(doc.definitions)
        ? doc.definitions
        : null;
    if (!schemas || Object.keys(schemas).length === 0) {
      throw new Error(
        'El spec no tiene esquemas (components.schemas en OpenAPI 3 o definitions en Swagger 2).',
      );
    }
    return { kind: 'openapi', version, schemas: normalizeSchemas(schemas) };
  }
  return { kind: 'data', json: JSON.stringify(doc) };
}

/**
 * Adapta esquemas OpenAPI a JSON Schema puro para quicktype:
 * - reescribe los $ref internos a la URI absoluta SCHEMA_BASE_URI;
 * - convierte `nullable: true` (OpenAPI 3.0) en `type: [T, "null"]`.
 */
export function normalizeSchemas(schemas: JsonSchemaMap): JsonSchemaMap {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!isRecord(node)) return node;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (key === 'nullable') continue;
      if (key === '$ref' && typeof value === 'string') {
        const prefix = REF_PREFIXES.find((p) => value.startsWith(p));
        out.$ref = prefix ? SCHEMA_BASE_URI + value.slice(prefix.length) : value;
      } else {
        out[key] = walk(value);
      }
    }
    if (node.nullable === true && typeof out.type === 'string') out.type = [out.type, 'null'];
    return out;
  };
  return walk(schemas) as JsonSchemaMap;
}
