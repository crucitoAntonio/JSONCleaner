export type Secret = 'gone' | 'show';

const SECRETS: Record<string, Secret> = {
  '200fd83c8fbe55df25bfc638e4ee2e746443ff037c78a985005dff0206e103d3': 'gone',
  '94ec569d8e519a3dd4e21e9a2014e4d45b4a2b2b0b820ca1a3e865480f9e6988': 'show',
};

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function matchSecret(text: string): Promise<Secret | null> {
  const normalized = text.trim().toLowerCase();
  if (!normalized || normalized.length > 64) return null;
  return SECRETS[await sha256Hex(normalized)] ?? null;
}
