export function readObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected a JSON object');
  }
  return value as Record<string, unknown>;
}

export function readString(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Expected a string');
  return value;
}

export function readNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Expected a finite number');
  return value;
}

export function readArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Expected an array');
  return value;
}

export function readOptionalString(value: unknown): string {
  return value === undefined ? '' : readString(value);
}

export function readUuid(value: unknown): string {
  const id = readString(value);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) {
    throw new Error('Expected a UUID');
  }
  return id;
}
