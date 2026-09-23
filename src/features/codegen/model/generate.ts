import {
  InputData,
  JSONSchemaInput,
  JSONSchemaStore,
  jsonInputForTargetLanguage,
  quicktype,
} from 'quicktype-core';
import type { JSONSchema } from 'quicktype-core';
import type { JsonSchemaMap, Source } from './source';
import { SCHEMA_BASE_URI, readSource } from './source';

export type TargetLang = 'kotlin' | 'java';

export interface GenerateOptions {
  text: string;
  lang: TargetLang;
  packageName: string;
  /** Nombre de la clase raíz cuando la entrada son datos (en un spec, cada esquema ya tiene nombre). */
  rootName: string;
}

export interface GeneratedFile {
  name: string;
  code: string;
}

export interface GenerateResult {
  source: Source['kind'];
  files: GeneratedFile[];
}

// Kotlin: data classes sin anotaciones. Java: POJO con campos privados + getters/setters,
// List<T> en vez de arreglos y getId() en vez de getID().
const RENDERER_OPTIONS: Record<TargetLang, Record<string, string>> = {
  kotlin: { 'just-types': 'true', 'acronym-style': 'camel' },
  java: { 'just-types': 'true', 'array-type': 'list', 'acronym-style': 'camel' },
};

class InMemorySchemaStore extends JSONSchemaStore {
  constructor(private readonly doc: JSONSchema) {
    super();
  }
  async fetch(): Promise<JSONSchema> {
    return this.doc;
  }
}

async function schemaInput(schemas: JsonSchemaMap): Promise<JSONSchemaInput> {
  const input = new JSONSchemaInput(
    new InMemorySchemaStore({ definitions: schemas } as JSONSchema),
  );
  for (const name of Object.keys(schemas)) {
    await input.addSource({ name, uris: [SCHEMA_BASE_URI + name] });
  }
  return input;
}

// quicktype emite Java como un solo texto con marcadores "// Nombre.java" antes de cada
// archivo; se separa para poder copiar/descargar cada clase por su lado.
export function splitJavaFiles(code: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const marker = /^\/\/ (\S+\.java)$/gm;
  const matches = [...code.matchAll(marker)];
  matches.forEach((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1]!.index : code.length;
    files.push({ name: m[1]!, code: code.slice(start, end).trim() + '\n' });
  });
  return files.length > 0 ? files : [{ name: 'Model.java', code }];
}

function toIdentifier(name: string, fallback: string): string {
  const cleaned = name.trim().replace(/[^A-Za-z0-9_]/g, '');
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : fallback;
}

export async function generateModels(opts: GenerateOptions): Promise<GenerateResult> {
  const source = readSource(opts.text);
  const rootName = toIdentifier(opts.rootName, 'Root');

  const inputData = new InputData();
  if (source.kind === 'openapi') {
    inputData.addInput(await schemaInput(source.schemas));
  } else {
    const jsonInput = jsonInputForTargetLanguage(opts.lang);
    await jsonInput.addSource({ name: rootName, samples: [source.json] });
    inputData.addInput(jsonInput);
  }

  const packageName = opts.packageName.trim() || 'com.example.model';
  const result = await quicktype({
    inputData,
    lang: opts.lang,
    rendererOptions: { ...RENDERER_OPTIONS[opts.lang], package: packageName },
  });
  const code = result.lines.join('\n').trim() + '\n';
  const files =
    opts.lang === 'java'
      ? splitJavaFiles(code)
      : [{ name: (source.kind === 'openapi' ? 'Models' : rootName) + '.kt', code }];
  return { source: source.kind, files };
}
