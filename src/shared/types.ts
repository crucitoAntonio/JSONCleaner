export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type Side = 'left' | 'right';

export function otherSide(side: Side): Side {
  return side === 'left' ? 'right' : 'left';
}
