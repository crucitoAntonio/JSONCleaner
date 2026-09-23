import type { JsonValue } from '../../../shared/types';

// Subconjunto de JSONPath, suficiente para filtrar documentos grandes:
//   $  .clave  ['clave']  [n] (negativos cuentan desde el final)  [*]  .*  ..clave  ..*
//   [0,2]  ['a','b']  [inicio:fin]  [?(@.campo)]  [?(@.campo.sub >= 10)]
// El `$` inicial es opcional: "players[*].name" equivale a "$.players[*].name".

type Literal = string | number | boolean | null;
type CompareOp = '==' | '!=' | '<' | '<=' | '>' | '>=';

type Selector =
  | { kind: 'key'; key: string }
  | { kind: 'index'; index: number }
  | { kind: 'wildcard' }
  | { kind: 'union'; items: (string | number)[] }
  | { kind: 'slice'; start: number | null; end: number | null }
  | { kind: 'filter'; path: string[]; op: CompareOp | null; value: Literal };

interface Segment {
  /** `..`: el selector se aplica al nodo y a todos sus descendientes. */
  descendant: boolean;
  selector: Selector;
}

export interface QueryMatch {
  /** Ruta normalizada del resultado, p. ej. `$.players[0].name`. */
  path: string;
  value: JsonValue;
}

export type QueryResult = { ok: true; matches: QueryMatch[] } | { ok: false; error: string };

const IDENT = /^[A-Za-z_$][\w$-]*/;
const NUMBER = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;

class Parser {
  private pos = 0;
  constructor(private readonly src: string) {}

  fail(message: string): never {
    throw new Error(message + ' (posición ' + (this.pos + 1) + ')');
  }

  private rest(): string {
    return this.src.slice(this.pos);
  }

  private skipSpaces(): void {
    while (this.src[this.pos] === ' ') this.pos++;
  }

  private eat(s: string): boolean {
    if (!this.src.startsWith(s, this.pos)) return false;
    this.pos += s.length;
    return true;
  }

  private expect(s: string): void {
    if (!this.eat(s)) this.fail('Se esperaba "' + s + '"');
  }

  private ident(): string | null {
    const m = IDENT.exec(this.rest());
    if (!m) return null;
    this.pos += m[0].length;
    return m[0];
  }

  private int(): number | null {
    const m = /^-?\d+/.exec(this.rest());
    if (!m) return null;
    this.pos += m[0].length;
    return Number(m[0]);
  }

  private quoted(): string | null {
    const quote = this.src[this.pos];
    if (quote !== "'" && quote !== '"') return null;
    let out = '';
    this.pos++;
    while (this.pos < this.src.length && this.src[this.pos] !== quote) {
      if (this.src[this.pos] === '\\') this.pos++;
      out += this.src[this.pos++] ?? '';
    }
    this.expect(quote);
    return out;
  }

  private literal(): Literal {
    const s = this.quoted();
    if (s !== null) return s;
    for (const [word, value] of [
      ['true', true],
      ['false', false],
      ['null', null],
    ] as const) {
      if (this.eat(word)) return value;
    }
    const m = NUMBER.exec(this.rest());
    if (!m) this.fail('Se esperaba un valor (número, texto entre comillas, true, false o null)');
    this.pos += m[0].length;
    return Number(m[0]);
  }

  private filter(): Selector {
    this.expect('(');
    this.skipSpaces();
    this.expect('@');
    const path: string[] = [];
    for (;;) {
      if (this.eat('.')) {
        const key = this.ident();
        if (key === null) this.fail('Se esperaba un nombre de campo después de "@."');
        path.push(key);
      } else if (this.src[this.pos] === '[') {
        this.pos++;
        const key = this.quoted() ?? this.int();
        if (key === null) this.fail('Se esperaba un nombre o índice entre corchetes');
        this.expect(']');
        path.push(String(key));
      } else break;
    }
    this.skipSpaces();
    const op = (['==', '!=', '<=', '>=', '<', '>'] as const).find((o) => this.eat(o)) ?? null;
    let value: Literal = null;
    if (op) {
      this.skipSpaces();
      value = this.literal();
      this.skipSpaces();
    }
    this.expect(')');
    return { kind: 'filter', path, op, value };
  }

  private bracket(): Selector {
    this.skipSpaces();
    if (this.eat('*')) return this.close({ kind: 'wildcard' });
    if (this.eat('?')) return this.close(this.filter());

    const first = this.quoted() ?? this.int();
    this.skipSpaces();
    if (this.src[this.pos] === ':' || first === null) {
      if (first !== null && typeof first !== 'number') this.fail('Un rango solo admite números');
      this.expect(':');
      this.skipSpaces();
      return this.close({ kind: 'slice', start: first, end: this.int() });
    }
    const items: (string | number)[] = [first];
    while (this.eat(',')) {
      this.skipSpaces();
      const item = this.quoted() ?? this.int();
      if (item === null) this.fail('Se esperaba un nombre o índice después de ","');
      items.push(item);
      this.skipSpaces();
    }
    if (items.length > 1) return this.close({ kind: 'union', items });
    return this.close(
      typeof first === 'number' ? { kind: 'index', index: first } : { kind: 'key', key: first },
    );
  }

  private close(selector: Selector): Selector {
    this.skipSpaces();
    this.expect(']');
    return selector;
  }

  parse(): Segment[] {
    this.skipSpaces();
    const segments: Segment[] = [];
    // Sin `$` inicial, la expresión arranca directamente con un nombre de campo.
    if (!this.eat('$')) {
      const key = this.ident();
      if (key !== null) segments.push({ descendant: false, selector: { kind: 'key', key } });
    }
    while (this.pos < this.src.length) {
      if (this.eat('..')) {
        if (this.eat('*')) segments.push({ descendant: true, selector: { kind: 'wildcard' } });
        else if (this.eat('[')) segments.push({ descendant: true, selector: this.bracket() });
        else {
          const key = this.ident();
          if (key === null) this.fail('Se esperaba un nombre después de ".."');
          segments.push({ descendant: true, selector: { kind: 'key', key } });
        }
      } else if (this.eat('.')) {
        if (this.eat('*')) segments.push({ descendant: false, selector: { kind: 'wildcard' } });
        else {
          const key = this.ident();
          if (key === null) this.fail('Se esperaba un nombre después de "."');
          segments.push({ descendant: false, selector: { kind: 'key', key } });
        }
      } else if (this.eat('[')) {
        segments.push({ descendant: false, selector: this.bracket() });
      } else if (this.src[this.pos] === ' ') {
        this.skipSpaces();
      } else {
        this.fail('Carácter inesperado "' + this.src[this.pos] + '"');
      }
    }
    return segments;
  }
}

function isObject(v: JsonValue): v is Record<string, JsonValue> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function keyPath(path: string, key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key)
    ? path + '.' + key
    : path + "['" + key.replace(/'/g, "\\'") + "']";
}

function children(node: QueryMatch): QueryMatch[] {
  const { path, value } = node;
  if (Array.isArray(value)) return value.map((v, i) => ({ path: path + '[' + i + ']', value: v }));
  if (isObject(value))
    return Object.entries(value).map(([k, v]) => ({ path: keyPath(path, k), value: v }));
  return [];
}

function selfAndDescendants(node: QueryMatch, out: QueryMatch[]): void {
  out.push(node);
  for (const child of children(node)) selfAndDescendants(child, out);
}

function compare(a: JsonValue | undefined, op: CompareOp, b: Literal): boolean {
  switch (op) {
    case '==':
      return a === b;
    case '!=':
      return a !== b;
    default:
      // Los órdenes solo comparan números con números y textos con textos.
      if (typeof a !== typeof b || (typeof a !== 'number' && typeof a !== 'string')) return false;
      if (op === '<') return a < (b as typeof a);
      if (op === '<=') return a <= (b as typeof a);
      if (op === '>') return a > (b as typeof a);
      return a >= (b as typeof a);
  }
}

function resolve(value: JsonValue, path: string[]): JsonValue | undefined {
  let cur: JsonValue | undefined = value;
  for (const key of path) {
    if (Array.isArray(cur)) cur = cur[Number(key) < 0 ? cur.length + Number(key) : Number(key)];
    else if (cur !== undefined && isObject(cur))
      cur = Object.hasOwn(cur, key) ? cur[key] : undefined;
    else return undefined;
  }
  return cur;
}

function select(node: QueryMatch, selector: Selector): QueryMatch[] {
  const { path, value } = node;
  const byKey = (key: string): QueryMatch[] =>
    isObject(value) && Object.hasOwn(value, key)
      ? [{ path: keyPath(path, key), value: value[key]! }]
      : [];
  const byIndex = (i: number): QueryMatch[] => {
    if (!Array.isArray(value)) return [];
    const idx = i < 0 ? value.length + i : i;
    return idx >= 0 && idx < value.length
      ? [{ path: path + '[' + idx + ']', value: value[idx]! }]
      : [];
  };

  switch (selector.kind) {
    case 'key':
      return byKey(selector.key);
    case 'index':
      return byIndex(selector.index);
    case 'wildcard':
      return children(node);
    case 'union':
      return selector.items.flatMap((item) =>
        typeof item === 'number' ? byIndex(item) : byKey(item),
      );
    case 'slice': {
      if (!Array.isArray(value)) return [];
      const n = value.length;
      const norm = (i: number) => Math.min(Math.max(i < 0 ? n + i : i, 0), n);
      const start = norm(selector.start ?? 0);
      const end = norm(selector.end ?? n);
      const out: QueryMatch[] = [];
      for (let i = start; i < end; i++) out.push({ path: path + '[' + i + ']', value: value[i]! });
      return out;
    }
    case 'filter':
      return children(node).filter((child) => {
        const target = resolve(child.value, selector.path);
        return selector.op ? compare(target, selector.op, selector.value) : target !== undefined;
      });
  }
}

export function runQuery(root: JsonValue, expression: string): QueryResult {
  let segments: Segment[];
  try {
    segments = new Parser(expression).parse();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  let nodes: QueryMatch[] = [{ path: '$', value: root }];
  for (const { descendant, selector } of segments) {
    if (descendant) {
      const expanded: QueryMatch[] = [];
      for (const node of nodes) selfAndDescendants(node, expanded);
      nodes = expanded;
    }
    nodes = nodes.flatMap((node) => select(node, selector));
  }
  return { ok: true, matches: nodes };
}
