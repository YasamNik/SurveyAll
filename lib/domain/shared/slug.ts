const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function randomSlug(len = 8): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let slug = '';
  for (let i = 0; i < len; i++) {
    slug += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return slug;
}
