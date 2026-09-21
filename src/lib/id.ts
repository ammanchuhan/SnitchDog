/** Short, URL-safe ids. Collision risk is irrelevant at this scale and the tokens are single-use. */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export const shortId = (len = 10) =>
  Array.from({ length: len }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
