// Deterministic, bijective codec between numeric database ids and short lowercase
// alphanumeric strings used in frontend URLs. Encoding/decoding both happen entirely
// client-side — the backend never sees or generates these codes, only real numeric ids.
//
// Design:
// - Codes are partitioned into length "classes" starting at MIN_LENGTH (5) and growing
//   without bound, so every id gets a code of length >= 5 and there is no maximum id.
// - Within a class of length L, the domain is 36^L (lowercase letters + digits). The low
//   ATTEMPT_BITS bits of that domain are reserved as a "profanity retry" nonce: encoding
//   tries nonce 0..15 and returns the first candidate that doesn't contain a blocked
//   substring. Decoding simply discards those bits, so this never breaks invertibility —
//   there is no ambiguous cycle-walking, the nonce is just extra bits of the same bijection.
// - The bijection itself is a fixed affine transform f(x) = (x*A + B) mod N. A is a prime
//   coprime to 6, which is automatically coprime to every N = 36^L (36 = 2^2 * 3^2), so one
//   constant works for every class.

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const BASE = 36n;
const MIN_LENGTH = 5;
const ATTEMPT_BITS = 4n;
const ATTEMPTS = 1n << ATTEMPT_BITS; // 16

// Fixed constants for the affine bijection. A is prime and coprime to 6, so gcd(A, 36^L) = 1
// for every length class L — no per-class key derivation needed.
const A = 104729n;
const B = 998244353n;

const BLOCKLIST = [
  "fuck", "shit", "bitch", "cunt", "dick", "piss", "cock", "pussy",
  "nigg", "fag", "slut", "whore", "rape", "nazi", "kike", "spic",
  "chink", "gook", "retard", "twat", "wank", "jerkoff", "asshole",
  "bastard", "dyke", "tranny", "paki", "coon", "wetback",
];

function containsBlockedWord(code) {
  return BLOCKLIST.some((word) => code.includes(word));
}

function classDomain(length) {
  return BASE ** BigInt(length);
}

function classCapacity(length) {
  return classDomain(length) / ATTEMPTS;
}

// Cumulative number of raw ids consumed by every class strictly below `length`.
function classOffset(length) {
  let offset = 0n;
  for (let l = MIN_LENGTH; l < length; l++) {
    offset += classCapacity(l);
  }
  return offset;
}

function modInverse(a, m) {
  let [oldR, r] = [a, m];
  let [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  return ((oldS % m) + m) % m;
}

function toBase36(value, length) {
  let v = value;
  let out = "";
  for (let i = 0; i < length; i++) {
    out = ALPHABET[Number(v % BASE)] + out;
    v /= BASE;
  }
  return out;
}

function fromBase36(code) {
  let value = 0n;
  for (const char of code) {
    const digit = ALPHABET.indexOf(char);
    if (digit === -1) throw new Error(`Invalid id code character: ${char}`);
    value = value * BASE + BigInt(digit);
  }
  return value;
}

// Finds the length class a given raw (0-indexed) id belongs to, and its offset within that class.
function locateClass(rawId) {
  let length = MIN_LENGTH;
  let offset = 0n;
  let capacity = classCapacity(length);
  while (rawId - offset >= capacity) {
    offset += capacity;
    length += 1;
    capacity = classCapacity(length);
  }
  return { length, indexInClass: rawId - offset };
}

export function encodeId(id) {
  const rawId = BigInt(id);
  if (rawId < 0n) throw new Error("encodeId expects a non-negative id");

  const { length, indexInClass } = locateClass(rawId);
  const N = classDomain(length);

  let fallback = null;
  for (let attempt = 0n; attempt < ATTEMPTS; attempt++) {
    const combined = indexInClass * ATTEMPTS + attempt;
    const scrambled = (combined * A + B) % N;
    const code = toBase36(scrambled, length);
    if (fallback === null) fallback = code;
    if (!containsBlockedWord(code)) return code;
  }
  return fallback;
}

export function decodeId(code) {
  if (typeof code !== "string" || !/^[0-9a-z]{5,}$/.test(code)) {
    throw new Error(`Invalid id code: ${code}`);
  }

  const length = code.length;
  const N = classDomain(length);
  const scrambled = fromBase36(code);
  const Ainv = modInverse(A, N);
  const combined = (((scrambled - B) % N) + N) % N * Ainv % N;
  const indexInClass = combined / ATTEMPTS;

  const id = classOffset(length) + indexInClass;
  return Number(id);
}
